// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./lib/Library.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Router {
    //////////////
    /// Errors ///
    //////////////

    error Router__Expired();
    error Router__InsufficientAmountA();
    error Router__InsufficientAmountB();
    error Router__ExcessiveInputAmount();
    error Router__InsufficientOutputAmount();

    /////////////////////////
    /// Type Declarations ///
    /////////////////////////

    using SafeERC20 for IERC20;

    ///////////////////////
    /// State variables ///
    ///////////////////////

    address public immutable FACTORY;

    /////////////////
    /// Modifiers ///
    /////////////////

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, Router__Expired());
        _;
    }

    /////////////////
    /// Functions ///
    /////////////////

    constructor(address _factory) {
        FACTORY = _factory;
    }

    //////////////////////////
    /// External Functions ///
    //////////////////////////

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        returns (uint256 amountA, uint256 amountB, uint256 liquidity)
    {
        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );
        IERC20(tokenA).safeTransferFrom(
            msg.sender,
            Library.pairFor(FACTORY, tokenA, tokenB),
            amountA
        );
        IERC20(tokenB).safeTransferFrom(
            msg.sender,
            Library.pairFor(FACTORY, tokenA, tokenB),
            amountB
        );
        liquidity = IPair(Library.pairFor(FACTORY, tokenA, tokenB)).mint(to);
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = Library.getAmountsOut(FACTORY, amountIn, path);
        require(
            amounts[amounts.length - 1] >= amountOutMin,
            Router__InsufficientOutputAmount()
        );

        address pair = Library.pairFor(FACTORY, path[0], path[1]);
        IERC20(path[0]).safeTransferFrom(msg.sender, pair, amounts[0]);
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = Library.getAmountsIn(FACTORY, amountOut, path);
        require(amounts[0] <= amountInMax, Router__ExcessiveInputAmount());

        address pair = Library.pairFor(FACTORY, path[0], path[1]);
        IERC20(path[0]).safeTransferFrom(msg.sender, pair, amounts[0]);
        _swap(amounts, path, to);
    }

    ////////////////////////
    /// Public Functions ///
    ////////////////////////

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = Library.pairFor(FACTORY, tokenA, tokenB);
        IPair(pair).transferFrom(msg.sender, pair, liquidity);
        (amountA, amountB) = IPair(pair).burn(to);
        require(amountA >= amountAMin, Router__InsufficientAmountA());
        require(amountB >= amountBMin, Router__InsufficientAmountB());
    }

    //////////////////////////
    /// Internal Functions ///
    //////////////////////////

    function _swap(
        uint256[] memory amounts,
        address[] memory path,
        address _to
    ) internal {
        for (uint256 i = 0; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, ) = Library.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address to = i < path.length - 2
                ? Library.pairFor(FACTORY, output, path[i + 2])
                : _to;
            IPair(Library.pairFor(FACTORY, input, output)).swap(
                amount0Out,
                amount1Out,
                to
            );
        }
    }

    ////////////////////////////////////////
    /// Public & External View Functions ///
    ////////////////////////////////////////

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut) {
        return Library.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountIn) {
        return Library.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        return Library.getAmountsOut(FACTORY, amountIn, path);
    }

    function getAmountsIn(
        uint256 amountOut,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        return Library.getAmountsIn(FACTORY, amountOut, path);
    }

    /////////////////////////////////////////
    /// Private & Internal View Functions ///
    /////////////////////////////////////////

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal virtual returns (uint256 amountA, uint256 amountB) {
        if (IFactory(FACTORY).getPair(tokenA, tokenB) == address(0)) {
            IFactory(FACTORY).createPair(tokenA, tokenB);
        }

        (uint256 reserveA, uint256 reserveB) = Library.getReserves(
            FACTORY,
            tokenA,
            tokenB
        );

        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = Library.quote(
                amountADesired,
                reserveA,
                reserveB
            );
            if (amountBOptimal <= amountBDesired) {
                require(
                    amountBOptimal >= amountBMin,
                    Router__InsufficientAmountB()
                );
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = Library.quote(
                    amountBDesired,
                    reserveB,
                    reserveA
                );
                assert(amountAOptimal <= amountADesired);
                require(
                    amountAOptimal >= amountAMin,
                    Router.Router__InsufficientAmountA()
                );
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }
}
