import { ethers } from "ethers";

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
}

export interface PairInfo {
  reserveA: string;
  reserveB: string;
  lpTokenBalance: string;
  totalSupply: string;
}

export interface Web3ContextProps {
  provider: ethers.BrowserProvider | null;
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

export interface DexContextProps {
  tokenA: TokenInfo | null;
  tokenB: TokenInfo | null;
  pairInfo: PairInfo;
  refreshBalances: () => Promise<void>;
  calculateSwapAmount: (amountIn: string, tokenIn: string) => Promise<string>;
  executeSwap: (
    amountIn: string,
    amountOutMin: string,
    tokenIn: string,
    tokenOut: string
  ) => Promise<ethers.TransactionResponse>;
  addLiquidity: (
    amountA: string,
    amountB: string,
    amountAMin: string,
    amountBMin: string
  ) => Promise<ethers.TransactionResponse>;
  removeLiquidity: (
    liquidity: string,
    amountAMin: string,
    amountBMin: string
  ) => Promise<ethers.TransactionResponse>;
  loading: boolean;
}
