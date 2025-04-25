// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {MyERC721Token} from "../src/MyERC721Token.sol";

contract DeployERC20TokenScript is Script {
    function run() public {
        vm.createSelectFork("sepolia");
        vm.startBroadcast();
        new MyERC721Token();
        vm.stopBroadcast();
    }
}
