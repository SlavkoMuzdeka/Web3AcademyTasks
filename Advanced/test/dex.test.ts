// test/dex.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { Factory, Router, TestToken, Pair } from "../typechain-types";

describe("Decentralized Exchange", function () {
  let user: any;
  let owner: any;
  let pair: Pair;
  let router: Router;
  let factory: Factory;
  let tokenA: TestToken;
  let tokenB: TestToken;
  const INITIAL_SUPPLY = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy test tokens
    const TestToken = await ethers.getContractFactory("TestToken");
    tokenA = await TestToken.deploy("Token A", "TKA");
    await tokenA.waitForDeployment();
    const tokenAAddress = await tokenA.getAddress();

    tokenB = await TestToken.deploy("Token B", "TKB");
    await tokenB.waitForDeployment();
    const tokenBAddress = await tokenB.getAddress();

    // Transfer some tokens to user
    const userAddress = await user.getAddress();
    await tokenA.transfer(userAddress, ethers.parseEther("100000"));
    await tokenB.transfer(userAddress, ethers.parseEther("100000"));

    // Deploy Factory
    const Factory = await ethers.getContractFactory("Factory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    // Deploy Router
    const Router = await ethers.getContractFactory("Router");
    router = await Router.deploy(factoryAddress);
    await router.waitForDeployment();
    const routerAddress = await router.getAddress();

    // Create pair
    await factory.createPair(tokenAAddress, tokenBAddress);
    const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);
    const Pair = await ethers.getContractFactory("Pair");
    pair = Pair.attach(pairAddress) as Pair;

    // Approve tokens for router
    await tokenA.approve(routerAddress, INITIAL_SUPPLY);
    await tokenB.approve(routerAddress, INITIAL_SUPPLY);
    await tokenA.connect(user).approve(routerAddress, INITIAL_SUPPLY);
    await tokenB.connect(user).approve(routerAddress, INITIAL_SUPPLY);
  });

  describe("Liquidity", function () {
    it("should add liquidity", async function () {
      const amountA = ethers.parseEther("1000");
      const amountB = ethers.parseEther("1000");
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();
      const ownerAddress = await owner.getAddress();

      // Add liquidity
      await router.addLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountA,
        amountB,
        0,
        0,
        ownerAddress,
        Math.floor(Date.now() / 1000) + 3600
      );

      // Get reserves and token0 ordering
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.getToken0();

      // Determine which reserve corresponds to tokenA
      const reserveA =
        token0.toLowerCase() === tokenAAddress.toLowerCase()
          ? reserve0
          : reserve1;
      const reserveB =
        token0.toLowerCase() === tokenAAddress.toLowerCase()
          ? reserve1
          : reserve0;

      expect(reserveA).to.equal(amountA);
      expect(reserveB).to.equal(amountB);

      // Check LP token minted
      const lpBalance = await pair.balanceOf(ownerAddress);
      expect(lpBalance).to.be.gt(0);
    });

    it("should add liquidity", async function () {
      const amountA = ethers.parseEther("1000");
      const amountB = ethers.parseEther("1000");
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();
      const ownerAddress = await owner.getAddress();

      const tx = await router.addLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountA,
        amountB,
        0,
        0,
        ownerAddress,
        Math.floor(Date.now() / 1000) + 3600
      );

      await tx.wait();

      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(amountA);
      expect(reserve1).to.equal(amountB);

      const lpBalance = await pair.balanceOf(ownerAddress);
      expect(lpBalance).to.be.gt(0);
    });

    it("should remove liquidity", async function () {
      const amountA = ethers.parseEther("1000");
      const amountB = ethers.parseEther("1000");
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();
      const ownerAddress = await owner.getAddress();
      const routerAddress = await router.getAddress();

      await router.addLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountA,
        amountB,
        0,
        0,
        ownerAddress,
        Math.floor(Date.now() / 1000) + 3600
      );

      const lpBalance = await pair.balanceOf(ownerAddress);

      // Approve LP tokens for router
      await pair.approve(routerAddress, lpBalance);

      const balanceABefore = await tokenA.balanceOf(ownerAddress);
      const balanceBBefore = await tokenB.balanceOf(ownerAddress);

      // Remove liquidity
      await router.removeLiquidity(
        tokenAAddress,
        tokenBAddress,
        lpBalance,
        0,
        0,
        ownerAddress,
        Math.floor(Date.now() / 1000) + 3600
      );

      const balanceAAfter = await tokenA.balanceOf(ownerAddress);
      const balanceBAfter = await tokenB.balanceOf(ownerAddress);

      // Check tokens were returned
      expect(balanceAAfter).to.be.gt(balanceABefore);
      expect(balanceBAfter).to.be.gt(balanceBBefore);

      // Check LP balance is now 0
      const lpBalanceAfter = await pair.balanceOf(ownerAddress);
      expect(lpBalanceAfter).to.equal(0);
    });
  });

  describe("Swaps", function () {
    beforeEach(async function () {
      // Add initial liquidity
      const amountA = ethers.parseEther("10000");
      const amountB = ethers.parseEther("10000");
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();
      const ownerAddress = await owner.getAddress();

      await router.addLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountA,
        amountB,
        0,
        0,
        ownerAddress,
        Math.floor(Date.now() / 1000) + 3600
      );
    });

    it("should swap tokens", async function () {
      const swapAmount = ethers.parseEther("100");
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();
      const userAddress = await user.getAddress();

      const userBalanceABefore = await tokenA.balanceOf(userAddress);
      const userBalanceBBefore = await tokenB.balanceOf(userAddress);

      // Calculate expected output
      const [reserveA, reserveB] = await router.getReserves(
        tokenAAddress,
        tokenBAddress
      );
      const expectedOutput = await router.getAmountOut(
        swapAmount,
        reserveA,
        reserveB
      );

      // Execute swap
      const path = [tokenAAddress, tokenBAddress];
      await router.connect(user).swapExactTokensForTokens(
        swapAmount,
        0, // Min output
        path,
        userAddress,
        Math.floor(Date.now() / 1000) + 3600
      );

      const userBalanceAAfter = await tokenA.balanceOf(userAddress);
      const userBalanceBAfter = await tokenB.balanceOf(userAddress);

      // Verify user balances changed correctly
      expect(userBalanceABefore - userBalanceAAfter).to.equal(swapAmount);
      expect(userBalanceBAfter - userBalanceBBefore).to.equal(expectedOutput);
    });

    it("should maintain constant product (k) after swap", async function () {
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();
      const userAddress = await user.getAddress();

      const [reserveABefore, reserveBBefore] = await router.getReserves(
        tokenAAddress,
        tokenBAddress
      );
      const kBefore = reserveABefore * reserveBBefore;

      // Execute swap
      const swapAmount = ethers.parseEther("100");
      const path = [tokenAAddress, tokenBAddress];
      await router.connect(user).swapExactTokensForTokens(
        swapAmount,
        0, // Min output
        path,
        userAddress,
        Math.floor(Date.now() / 1000) + 3600
      );

      // Check reserves after swap
      const [reserveAAfter, reserveBAfter] = await router.getReserves(
        tokenAAddress,
        tokenBAddress
      );
      const kAfter = reserveAAfter * reserveBAfter;

      // k should be the same or slightly higher due to fees
      expect(kAfter).to.be.gte(kBefore);
    });
  });

  describe("End-to-End Testing", function () {
    it("should handle multiple operations", async function () {
      const tokenAAddress = await tokenA.getAddress();
      const tokenBAddress = await tokenB.getAddress();
      const ownerAddress = await owner.getAddress();
      const userAddress = await user.getAddress();
      const routerAddress = await router.getAddress();

      // 1. Add initial liquidity
      const amountA = ethers.parseEther("1000");
      const amountB = ethers.parseEther("1000");

      await router.addLiquidity(
        tokenAAddress,
        tokenBAddress,
        amountA,
        amountB,
        0,
        0,
        ownerAddress,
        Math.floor(Date.now() / 1000) + 3600
      );

      // 2. User swaps TokenA for TokenB
      const swapAmount = ethers.parseEther("100");
      const path = [tokenAAddress, tokenBAddress];
      await router
        .connect(user)
        .swapExactTokensForTokens(
          swapAmount,
          0,
          path,
          userAddress,
          Math.floor(Date.now() / 1000) + 3600
        );

      // 3. User adds liquidity
      const userAmountA = ethers.parseEther("200");
      const userAmountB = ethers.parseEther("200");

      await router
        .connect(user)
        .addLiquidity(
          tokenAAddress,
          tokenBAddress,
          userAmountA,
          userAmountB,
          0,
          0,
          userAddress,
          Math.floor(Date.now() / 1000) + 3600
        );

      const userLpBalance = await pair.balanceOf(userAddress);
      expect(userLpBalance).to.be.gt(0);

      // 4. User removes liquidity
      await pair.connect(user).approve(routerAddress, userLpBalance);

      await router
        .connect(user)
        .removeLiquidity(
          tokenAAddress,
          tokenBAddress,
          userLpBalance,
          0,
          0,
          userAddress,
          Math.floor(Date.now() / 1000) + 3600
        );

      const userLpBalanceAfter = await pair.balanceOf(userAddress);
      expect(userLpBalanceAfter).to.equal(0);
    });
  });
});
