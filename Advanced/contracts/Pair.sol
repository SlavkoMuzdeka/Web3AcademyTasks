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
    error Pair__Forbidden();
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

    address public immutable i_factory;
    uint256 private constant MINIMUM_LIQUIDITY = 1000;

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

    constructor() ERC20("Uni Pair", "UNI") {
        i_factory = msg.sender;
    }

    //////////////////////////
    /// External Functions ///
    //////////////////////////

    function initialize(address _token0, address _token1) external {
        require(token0 == address(0), Pair__AlreadyInitialized());
        require(msg.sender == i_factory, Pair__Forbidden());
        token0 = _token0;
        token1 = _token1;
    }

    function mint(
        address to
    ) external nonReentrant returns (uint256 liquidity) {
        (uint256 pomReserve0, uint256 pomReserve1) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - pomReserve0;
        uint256 amount1 = balance1 - pomReserve1;

        uint256 totalSupply = totalSupply();
        if (totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(this), MINIMUM_LIQUIDITY);
        } else {
            liquidity = Math.min(
                (amount0 * totalSupply) / pomReserve0,
                (amount1 * totalSupply) / pomReserve1
            );
        }

        require(liquidity > 0, Pair__InsufficientLiquidityMinted());
        _mint(to, liquidity);
        _update(balance0, balance1);
        emit Mint(to, amount0, amount1);
    }

    function burn(
        address to
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / totalSupply;
        amount1 = (liquidity * balance1) / totalSupply;

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

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to
    ) external nonReentrant {
        require(
            amount0Out > 0 || amount1Out > 0,
            Pair__InsufficientOutputAmount()
        );

        (uint256 pomReserve0, uint256 pomReserve1) = getReserves();
        require(
            amount0Out < pomReserve0 && amount1Out < pomReserve1,
            Pair__InsufficientLiquidity()
        );

        uint256 balance0;
        uint256 balance1;
        {
            address pomToken0 = token0;
            address pomToken1 = token1;
            require(to != pomToken0 && to != pomToken1, Pair__InvalidTo());

            if (amount0Out > 0) IERC20(pomToken0).safeTransfer(to, amount0Out);
            if (amount1Out > 0) IERC20(pomToken1).safeTransfer(to, amount1Out);

            balance0 = IERC20(pomToken0).balanceOf(address(this));
            balance1 = IERC20(pomToken1).balanceOf(address(this));
        }

        uint256 amount0In = balance0 > pomReserve0 - amount0Out
            ? balance0 - (pomReserve0 - amount0Out)
            : 0;
        uint256 amount1In = balance1 > pomReserve1 - amount1Out
            ? balance1 - (pomReserve1 - amount1Out)
            : 0;

        require(
            amount0In > 0 || amount1In > 0,
            Pair__InsufficientInputAmount()
        );

        // Fee is taken: 0.3%
        uint256 balance0Adjusted = balance0 * MINIMUM_LIQUIDITY - amount0In * 3;
        uint256 balance1Adjusted = balance1 * MINIMUM_LIQUIDITY - amount1In * 3;
        require(
            balance0Adjusted * balance1Adjusted >=
                pomReserve0 * pomReserve1 * MINIMUM_LIQUIDITY ** 2,
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
