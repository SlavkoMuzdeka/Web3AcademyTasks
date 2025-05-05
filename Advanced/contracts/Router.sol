// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./libraries/Library.sol";
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

    address public immutable i_factory;

    /////////////////
    /// Functions ///
    /////////////////

    constructor(address _factory) {
        i_factory = _factory;
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
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(deadline >= block.timestamp, Router__Expired());
        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        address pair = Library.pairFor(i_factory, tokenA, tokenB);
        IERC20(tokenA).safeTransferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, pair, amountB);
        liquidity = IPair(pair).mint(to);
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, Router__Expired());

        amounts = Library.getAmountsOut(i_factory, amountIn, path);

        require(
            amounts[amounts.length - 1] >= amountOutMin,
            Router__InsufficientOutputAmount()
        );

        address pair = Library.pairFor(i_factory, path[0], path[1]);
        IERC20(path[0]).safeTransferFrom(msg.sender, pair, amounts[0]);
        _swap(amounts, path, to);
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to
    ) external returns (uint256[] memory amounts) {
        amounts = Library.getAmountsIn(i_factory, amountOut, path);
        require(amounts[0] <= amountInMax, Router__ExcessiveInputAmount());

        address pair = Library.pairFor(i_factory, path[0], path[1]);
        IERC20(path[0]).safeTransferFrom(msg.sender, pair, amounts[0]);
        _swap(amounts, path, to);
    }

    function getReserves(
        address tokenA,
        address tokenB
    ) external view returns (uint256, uint256) {
        return Library.getReserves(i_factory, tokenA, tokenB);
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
    ) public returns (uint256 amountA, uint256 amountB) {
        require(deadline >= block.timestamp, Router__Expired());

        address pair = Library.pairFor(i_factory, tokenA, tokenB);

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
                ? Library.pairFor(i_factory, output, path[i + 2])
                : _to;

            IPair(Library.pairFor(i_factory, input, output)).swap(
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
        return Library.getAmountsOut(i_factory, amountIn, path);
    }

    function getAmountsIn(
        uint256 amountOut,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        return Library.getAmountsIn(i_factory, amountOut, path);
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
        if (IFactory(i_factory).getPair(tokenA, tokenB) == address(0)) {
            IFactory(i_factory).createPair(tokenA, tokenB);
        }

        (uint256 reserveA, uint256 reserveB) = Library.getReserves(
            i_factory,
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
