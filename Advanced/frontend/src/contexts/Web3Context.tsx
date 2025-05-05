import React, {
  useState,
  useEffect,
  ReactNode,
  useContext,
  createContext,
} from "react";
import { ethers } from "ethers";
import {
  getPairContract,
  getTokenContract,
  getRouterContract,
  CONTRACT_ADDRESSES,
  getFactoryContract,
} from "../utils/contracts";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextProps {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  account: string | null;
  chainId: number | null;
  factoryContract: ethers.Contract | null;
  routerContract: ethers.Contract | null;
  pairContract: ethers.Contract | null;
  tokenAContract: ethers.Contract | null;
  tokenBContract: ethers.Contract | null;
  connectWallet: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextProps>({
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

export const useWeb3 = () => useContext(Web3Context);

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
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
        await window.ethereum.request({ method: "eth_requestAccounts" });

        const ethersProvider = new ethers.Provider(window.ethereum);
        setProvider(ethersProvider);

        const ethersSigner = ethersProvider.getSigner();
        setSigner(ethersSigner);

        const address = await ethersSigner.getAddress();
        setAccount(address);

        const { chainId } = await ethersProvider.getNetwork();
        setChainId(chainId);

        const factory = getFactoryContract(ethersSigner);
        setFactoryContract(factory);

        const router = getRouterContract(ethersSigner);
        setRouterContract(router);

        const pair = getPairContract(ethersSigner);
        setPairContract(pair);

        const tokenA = getTokenContract(
          CONTRACT_ADDRESSES.TokenA,
          ethersSigner
        );
        setTokenAContract(tokenA);

        const tokenB = getTokenContract(
          CONTRACT_ADDRESSES.TokenB,
          ethersSigner
        );
        setTokenBContract(tokenB);
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      }
    } else {
      console.error(
        "Ethereum provider not found. Install MetaMask or another wallet."
      );
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
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
