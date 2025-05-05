// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Pair.sol";

contract Factory {
    //////////////
    /// Errors ///
    //////////////

    error Factory__PairExists();
    error Factory__ZeroAddress();
    error Factory__IdenticalAddresses();

    ///////////////////////
    /// State variables ///
    ///////////////////////

    address[] public allPairs;
    mapping(address => mapping(address => address)) public getPair;

    //////////////
    /// Events ///
    //////////////

    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint
    );

    //////////////////////////
    /// External Functions ///
    //////////////////////////

    /**
     * @dev Creates a new pair for the given tokens.
     * @param tokenA The address of the first token.
     * @param tokenB The address of the second token.
     * @return pair The address of the newly created pair contract.
     */
    function createPair(
        address tokenA,
        address tokenB
    ) external returns (address pair) {
        require(tokenA != tokenB, Factory__IdenticalAddresses());

        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), Factory__ZeroAddress());
        require(getPair[token0][token1] == address(0), Factory__PairExists());

        bytes memory bytecode = type(Pair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        Pair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
        return pair;
    }
}
