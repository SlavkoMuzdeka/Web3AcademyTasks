// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/Pair.sol";
import "../src/Router.sol";
import "../src/TokenA.sol";
import "../src/TokenB.sol";
import "../src/Factory.sol";
import "forge-std/Test.sol";
import "forge-std/console2.sol";

contract AMM_Test is Test {
    Factory public factory;
    Router public router;
    TokenA public tokenA;
    TokenB public tokenB;
    address public pair;

    address public user1 = address(1);
    address public user2 = address(2);

    function setUp() public {
        factory = new Factory();
        router = new Router(address(factory));
        tokenA = new TokenA();
        tokenB = new TokenB();

        tokenA.transfer(user1, 10000e18);
        tokenB.transfer(user1, 10000e18);
        tokenA.transfer(user2, 5000e18);
        tokenB.transfer(user2, 5000e18);

        vm.startPrank(user1);
        tokenA.approve(address(router), type(uint).max);
        tokenB.approve(address(router), type(uint).max);
        vm.stopPrank();

        vm.startPrank(user2);
        tokenA.approve(address(router), type(uint).max);
        tokenB.approve(address(router), type(uint).max);
        vm.stopPrank();
    }

    function testAddLiquidity() public {
        console2.log("User 1 - token A balance: ", tokenA.balanceOf(user1));
        console2.log("User 1 - token B balance: ", tokenB.balanceOf(user1));
        console2.log("User 2 - token A balance: ", tokenA.balanceOf(user2));
        console2.log("User 2 - token B balance: ", tokenB.balanceOf(user2));

        vm.startPrank(user1);
        (uint amountA, uint amountB, uint liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000e18,
            1000e18,
            0,
            0,
            user1,
            block.timestamp + 1
        );
        vm.stopPrank();

        console2.log("TokenA balance: ", tokenA.balanceOf(user1));
        console2.log("TokenB balance: ", tokenB.balanceOf(user1));
        console2.log("Liquidity: ", liquidity);
        pair = factory.getPair(address(tokenA), address(tokenB));
        console2.log("Pair address: ", pair);
        // assertEq(pair != address(0), true);
        // assertEq(amountA, 1000e18);
        // assertEq(amountB, 1000e18);
        // assertGt(liquidity, 0);

        // (uint reserve0, uint reserve1) = Pair(pair).getReserves();
        // assertEq(reserve0 + reserve1, 2000e18);
    }

    function testSwap() public {
        // First add liquidity
        vm.startPrank(user1);
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 * 10 ** 18,
            1000 * 10 ** 18,
            0,
            0,
            user1,
            block.timestamp + 1
        );
        vm.stopPrank();

        pair = factory.getPair(address(tokenA), address(tokenB));

        // Record initial balances
        uint user2InitialTokenA = tokenA.balanceOf(user2);
        uint user2InitialTokenB = tokenB.balanceOf(user2);

        // Swap tokens
        vm.startPrank(user2);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        uint[] memory amounts = router.swapExactTokensForTokens(
            100 * 10 ** 18, // 100 TokenA
            0, // Minimum TokenB to receive
            path,
            user2,
            block.timestamp + 1
        );
        vm.stopPrank();

        // Verify swap results
        uint user2FinalTokenA = tokenA.balanceOf(user2);
        uint user2FinalTokenB = tokenB.balanceOf(user2);

        assertEq(user2InitialTokenA - user2FinalTokenA, 100 * 10 ** 18); // 100 TokenA spent
        assertEq(user2FinalTokenB - user2InitialTokenB, amounts[1]); // Received calculated amount of TokenB

        // Verify that the swap follows the x*y=k formula
        (uint reserve0, uint reserve1) = Pair(pair).getReserves();
        address token0 = Pair(pair).getToken0();

        if (token0 == address(tokenA)) {
            assertApproxEqRel(
                reserve0 * reserve1,
                (1000 * 10 ** 18 + 100 * 10 ** 18 - amounts[1]) *
                    (1000 * 10 ** 18 - amounts[1]),
                1e15
            ); // 0.1% tolerance due to fees
        } else {
            assertApproxEqRel(
                reserve0 * reserve1,
                (1000 * 10 ** 18 - amounts[1]) *
                    (1000 * 10 ** 18 + 100 * 10 ** 18 - amounts[1]),
                1e15
            ); // 0.1% tolerance due to fees
        }
    }

    function testRemoveLiquidity() public {
        // First add liquidity
        vm.startPrank(user1);
        (, , uint liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 * 10 ** 18,
            1000 * 10 ** 18,
            0,
            0,
            user1,
            block.timestamp + 1
        );

        pair = factory.getPair(address(tokenA), address(tokenB));

        // Approve liquidity tokens for router
        Pair(pair).approve(address(router), type(uint).max);

        // Record initial balances
        uint initialTokenA = tokenA.balanceOf(user1);
        uint initialTokenB = tokenB.balanceOf(user1);

        // Remove 50% of liquidity
        uint liquidityToRemove = liquidity / 2;
        (uint amountA, uint amountB) = router.removeLiquidity(
            address(tokenA),
            address(tokenB),
            liquidityToRemove,
            0, // Minimum TokenA
            0, // Minimum TokenB
            user1,
            block.timestamp + 1
        );
        vm.stopPrank();

        // Verify tokens returned
        uint finalTokenA = tokenA.balanceOf(user1);
        uint finalTokenB = tokenB.balanceOf(user1);

        assertEq(finalTokenA - initialTokenA, amountA);
        assertEq(finalTokenB - initialTokenB, amountB);
        assertApproxEqRel(amountA, 500 * 10 ** 18, 1e16); // ~500 TokenA (with small deviation for rounding)
        assertApproxEqRel(amountB, 500 * 10 ** 18, 1e16); // ~500 TokenB (with small deviation for rounding)
    }
}
