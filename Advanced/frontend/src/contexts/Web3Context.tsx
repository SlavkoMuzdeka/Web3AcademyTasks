import { ethers } from "ethers";
import { Web3ContextProps } from "../types";
import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  getPairContract,
  getTokenContract,
  getRouterContract,
  getFactoryContract,
  CONTRACT_ADDRESSES,
} from "../utils/contracts";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const Web3Context = createContext<Web3ContextProps>({
  provider: null,
  signer: null,
  account: null,
  chainId: null,
  factoryContract: null,
  routerContract: null,
  pairContract: null,
  tokenAContract: null,
  tokenBContract: null,
  connectWallet: async () => {},
});

export const Web3Provider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [factoryContract, setFactoryContract] =
    useState<ethers.Contract | null>(null);
  const [routerContract, setRouterContract] = useState<ethers.Contract | null>(
    null
  );
  const [pairContract, setPairContract] = useState<ethers.Contract | null>(
    null
  );
  const [tokenAContract, setTokenAContract] = useState<ethers.Contract | null>(
    null
  );
  const [tokenBContract, setTokenBContract] = useState<ethers.Contract | null>(
    null
  );

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        await ethProvider.send("eth_requestAccounts", []);
        const ethSigner = await ethProvider.getSigner();
        const address = await ethSigner.getAddress();
        const { chainId } = await ethProvider.getNetwork();

        setProvider(ethProvider);
        setSigner(ethSigner);
        setAccount(address);
        setChainId(Number(chainId));
        setFactoryContract(getFactoryContract(ethSigner));
        setRouterContract(getRouterContract(ethSigner));
        setPairContract(getPairContract(ethSigner));
        setTokenAContract(
          getTokenContract(CONTRACT_ADDRESSES.TokenA, ethSigner)
        );
        setTokenBContract(
          getTokenContract(CONTRACT_ADDRESSES.TokenB, ethSigner)
        );
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || null);
      });
      window.ethereum.on("chainChanged", (chainId: string) => {
        setChainId(parseInt(chainId, 16));
      });
      return () => {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
      };
    }
  }, []);

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        account,
        chainId,
        factoryContract,
        routerContract,
        pairContract,
        tokenAContract,
        tokenBContract,
        connectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
