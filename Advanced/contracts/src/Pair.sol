// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Pair is ERC20, ReentrancyGuard {
    //////////////
    /// Errors ///
    //////////////

    error Pair__InvalidTo();
    error Pair__AlreadyInitialized();
    error Pair__InsufficientLiquidity();
    error Pair__InsufficientInputAmount();
    error Pair__InsufficientOutputAmount();
    error Pair__InsufficientLiquidityMinted();
    error Pair__InsufficientLiquidityBurned();

    /////////////////////////
    /// Type Declarations ///
    /////////////////////////

    using SafeERC20 for IERC20;

    ///////////////////////
    /// State variables ///
    ///////////////////////

    address private token0;
    address private token1;
    uint256 private reserve0;
    uint256 private reserve1;

    //////////////
    /// Events ///
    //////////////

    event Sync(uint256 reserve0, uint256 reserve1);
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );

    /////////////////
    /// Functions ///
    /////////////////

    constructor() ERC20("Uniswap V2 Pair", "UNI") {}

    //////////////////////////
    /// External Functions ///
    //////////////////////////

    function initialize(address _token0, address _token1) external {
        require(token0 == address(0), Pair__AlreadyInitialized());
        token0 = _token0;
        token1 = _token1;
    }

    // Function to mint LP tokens when liquidity is provided
    function mint(
        address to
    ) external nonReentrant returns (uint256 liquidity) {
        (uint256 _reserve0, uint256 _reserve1) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - 1000; // Initial liquidity - min to prevent attacks
            _mint(address(0), 1000); // Lock the first 1000 tokens
        } else {
            liquidity = Math.min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }

        require(liquidity > 0, Pair__InsufficientLiquidityMinted());

        _mint(to, liquidity);
        _update(balance0, balance1);
        emit Mint(to, amount0, amount1);
    }

    // Function to burn LP tokens when liquidity is removed
    function burn(
        address to
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;

        require(
            amount0 > 0 && amount1 > 0,
            Pair__InsufficientLiquidityBurned()
        );

        _burn(address(this), liquidity);

        IERC20(token0).safeTransfer(to, amount0);
        IERC20(token1).safeTransfer(to, amount1);

        balance0 = IERC20(token0).balanceOf(address(this));
        balance1 = IERC20(token1).balanceOf(address(this));

        _update(balance0, balance1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // Function to swap tokens
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to
    ) external nonReentrant {
        require(
            amount0Out > 0 || amount1Out > 0,
            Pair__InsufficientOutputAmount()
        );

        (uint256 _reserve0, uint256 _reserve1) = getReserves();

        require(
            amount0Out < _reserve0 && amount1Out < _reserve1,
            Pair__InsufficientLiquidity()
        );

        uint256 balance0;
        uint256 balance1;
        {
            address _token0 = token0;
            address _token1 = token1;
            if (to == _token0 || to == _token1) {
                revert Pair__InvalidTo();
            }

            if (amount0Out > 0) IERC20(_token0).safeTransfer(to, amount0Out);
            if (amount1Out > 0) IERC20(_token1).safeTransfer(to, amount1Out);

            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }

        uint256 amount0In = balance0 > _reserve0 - amount0Out
            ? balance0 - (_reserve0 - amount0Out)
            : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out
            ? balance1 - (_reserve1 - amount1Out)
            : 0;

        if (amount0In <= 0 && amount1In <= 0) {
            revert Pair__InsufficientInputAmount();
        }

        // Fee is taken: 0.3%
        uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
        uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;
        require(
            balance0Adjusted * balance1Adjusted >=
                _reserve0 * _reserve1 * 1000 ** 2,
            "K"
        );

        _update(balance0, balance1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    function getToken0() external view returns (address) {
        return token0;
    }

    function getToken1() external view returns (address) {
        return token1;
    }

    ////////////////////////
    /// Public Functions ///
    ////////////////////////

    function getReserves() public view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    /////////////////////////
    /// Private Functions ///
    /////////////////////////

    function _update(uint256 balance0, uint256 balance1) private {
        reserve0 = balance0;
        reserve1 = balance1;
        emit Sync(reserve0, reserve1);
    }
}
