import { ethers } from "ethers";

import PairABI from "../abis/Pair.json";
import RouterABI from "../abis/Router.json";
import FactoryABI from "../abis/Factory.json";
import TokenABI from "../abis/TestToken.json";

export const CONTRACT_ADDRESSES = {
  TokenA: "0x...",
  TokenB: "0x...",
  Factory: "0x...",
  Router: "0x...",
  Pair: "0x...",
};

export function getFactoryContract(provider: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.Factory,
    FactoryABI.abi,
    provider
  );
}

export function getRouterContract(provider: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.Router,
    RouterABI.abi,
    provider
  );
}

export function getPairContract(provider: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(CONTRACT_ADDRESSES.Pair, PairABI.abi, provider);
}

export function getTokenContract(
  address: string,
  provider: ethers.Provider | ethers.Signer
) {
  return new ethers.Contract(address, TokenABI.abi, provider);
}
