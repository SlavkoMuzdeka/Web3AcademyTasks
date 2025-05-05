import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // Deploy test tokens
  const TestToken = await ethers.getContractFactory("TestToken");

  const tokenA = await TestToken.deploy("Token A", "TKNA");
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("TokenA deployed to:", tokenAAddress);

  const tokenB = await TestToken.deploy("Token B", "TKNB");
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("TokenB deployed to:", tokenBAddress);

  // Deploy Factory
  const Factory = await ethers.getContractFactory("Factory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("Factory deployed to:", factoryAddress);

  // Deploy Router
  const Router = await ethers.getContractFactory("Router");
  const router = await Router.deploy(factoryAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("Router deployed to:", routerAddress);

  // Create a pair
  const createPairTx = await factory.createPair(tokenAAddress, tokenBAddress);
  await createPairTx.wait();
  const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);
  console.log("Pair created at:", pairAddress);

  console.log("Contract Addresses for Frontend:");
  console.log(
    JSON.stringify({
      TokenA: tokenAAddress,
      TokenB: tokenBAddress,
      Factory: factoryAddress,
      Router: routerAddress,
      Pair: pairAddress,
    })
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
