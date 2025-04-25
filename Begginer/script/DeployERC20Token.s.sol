// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {MyERC20Token} from "../src/MyERC20Token.sol";

contract DeployERC20TokenScript is Script {
    uint256 private constant INITIAL_SUPPLY = 1000000 * 10 ** 18; // 1 million tokens with 18 decimals

    function run() public {
        vm.createSelectFork("sepolia");
        vm.startBroadcast();
        new MyERC20Token(INITIAL_SUPPLY);
        vm.stopBroadcast();
    }
}
