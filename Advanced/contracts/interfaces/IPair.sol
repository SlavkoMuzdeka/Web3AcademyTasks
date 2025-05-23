// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPair {
    function getToken0() external view returns (address);

    function getToken1() external view returns (address);

    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1);

    function mint(address to) external returns (uint liquidity);

    function burn(address to) external returns (uint amount0, uint amount1);

    function swap(uint amount0Out, uint amount1Out, address to) external;

    function transferFrom(
        address from,
        address to,
        uint value
    ) external returns (bool);
}
