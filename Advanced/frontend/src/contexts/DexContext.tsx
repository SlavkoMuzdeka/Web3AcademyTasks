import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import { useWeb3 } from "./Web3Context";
import { CONTRACT_ADDRESSES } from "../utils/contracts";

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
}

interface DexContextProps {
  tokenA: TokenInfo | null;
  tokenB: TokenInfo | null;
  pairInfo: {
    reserveA: string;
    reserveB: string;
    lpTokenBalance: string;
    totalSupply: string;
  };
  refreshBalances: () => Promise<void>;
  calculateSwapAmount: (amountIn: string, tokenIn: string) => Promise<string>;
  executeSwap: (
    amountIn: string,
    amountOutMin: string,
    tokenIn: string,
    tokenOut: string
  ) => Promise<ethers.ContractTransaction>;
  addLiquidity: (
    amountA: string,
    amountB: string,
    amountAMin: string,
    amountBMin: string
  ) => Promise<ethers.ContractTransaction>;
  removeLiquidity: (
    liquidity: string,
    amountAMin: string,
    amountBMin: string
  ) => Promise<ethers.ContractTransaction>;
  loading: boolean;
}

const DexContext = createContext<DexContextProps>({
  tokenA: null,
  tokenB: null,
  pairInfo: {
    reserveA: "0",
    reserveB: "0",
    lpTokenBalance: "0",
    totalSupply: "0",
  },
  refreshBalances: async () => {},
  calculateSwapAmount: async () => "0",
  executeSwap: async () => ({} as ethers.ContractTransaction),
  addLiquidity: async () => ({} as ethers.ContractTransaction),
  removeLiquidity: async () => ({} as ethers.ContractTransaction),
  loading: false,
});

export const useDex = () => useContext(DexContext);

interface DexProviderProps {
  children: ReactNode;
}

export const DexProvider: React.FC<DexProviderProps> = ({ children }) => {
  const {
    account,
    signer,
    routerContract,
    pairContract,
    tokenAContract,
    tokenBContract,
  } = useWeb3();

  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);
  const [pairInfo, setPairInfo] = useState({
    reserveA: "0",
    reserveB: "0",
    lpTokenBalance: "0",
    totalSupply: "0",
  });
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize token info and balances
  useEffect(() => {
    if (account && tokenAContract && tokenBContract) {
      refreshBalances();
    }
  }, [account, tokenAContract, tokenBContract]);

  const refreshBalances = async () => {
    if (
      !account ||
      !signer ||
      !routerContract ||
      !pairContract ||
      !tokenAContract ||
      !tokenBContract
    ) {
      return;
    }

    setLoading(true);
    try {
      // Get token A info
      const nameA = await tokenAContract.name();
      const symbolA = await tokenAContract.symbol();
      const decimalsA = await tokenAContract.decimals();
      const balanceA = await tokenAContract.balanceOf(account);

      setTokenA({
        address: CONTRACT_ADDRESSES.TokenA,
        name: nameA,
        symbol: symbolA,
        decimals: decimalsA,
        balance: ethers.utils.formatEther(balanceA),
      });

      // Get token B info
      const nameB = await tokenBContract.name();
      const symbolB = await tokenBContract.symbol();
      const decimalsB = await tokenBContract.decimals();
      const balanceB = await tokenBContract.balanceOf(account);

      setTokenB({
        address: CONTRACT_ADDRESSES.TokenB,
        name: nameB,
        symbol: symbolB,
        decimals: decimalsB,
        balance: ethers.utils.formatEther(balanceB),
      });

      // Get pair info
      const [reserveA, reserveB] = await routerContract.getReserves(
        CONTRACT_ADDRESSES.TokenA,
        CONTRACT_ADDRESSES.TokenB
      );

      const lpTokenBalance = await pairContract.balanceOf(account);
      const totalSupply = await pairContract.totalSupply();

      setPairInfo({
        reserveA: ethers.utils.formatEther(reserveA),
        reserveB: ethers.utils.formatEther(reserveB),
        lpTokenBalance: ethers.utils.formatEther(lpTokenBalance),
        totalSupply: ethers.utils.formatEther(totalSupply),
      });
    } catch (error) {
      console.error("Error refreshing balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSwapAmount = async (
    amountIn: string,
    tokenIn: string
  ): Promise<string> => {
    if (!routerContract || amountIn === "" || parseFloat(amountIn) === 0) {
      return "0";
    }

    try {
      const tokenInAddress =
        tokenIn === CONTRACT_ADDRESSES.TokenA
          ? CONTRACT_ADDRESSES.TokenA
          : CONTRACT_ADDRESSES.TokenB;
      const tokenOutAddress =
        tokenIn === CONTRACT_ADDRESSES.TokenA
          ? CONTRACT_ADDRESSES.TokenB
          : CONTRACT_ADDRESSES.TokenA;

      const [reserveIn, reserveOut] = await routerContract.getReserves(
        tokenInAddress,
        tokenOutAddress
      );

      const parsedAmountIn = ethers.utils.parseEther(amountIn);
      const amountOut = await routerContract.getAmountOut(
        parsedAmountIn,
        reserveIn,
        reserveOut
      );

      return ethers.utils.formatEther(amountOut);
    } catch (error) {
      console.error("Error calculating swap amount:", error);
      return "0";
    }
  };

  const executeSwap = async (
    amountIn: string,
    amountOutMin: string,
    tokenIn: string,
    tokenOut: string
  ): Promise<ethers.ContractTransaction> => {
    if (!routerContract || !signer || !account) {
      throw new Error("Missing required contracts or wallet connection");
    }

    setLoading(true);
    try {
      const parsedAmountIn = ethers.utils.parseEther(amountIn);
      const parsedAmountOutMin = ethers.utils.parseEther(amountOutMin);
      const path = [tokenIn, tokenOut];
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // Approve token spending first
      const tokenContract =
        tokenIn === CONTRACT_ADDRESSES.TokenA ? tokenAContract : tokenBContract;
      await tokenContract?.approve(routerContract.address, parsedAmountIn);

      // Execute swap
      const tx = await routerContract.swapExactTokensForTokens(
        parsedAmountIn,
        parsedAmountOutMin,
        path,
        account,
        deadline
      );

      await tx.wait();
      await refreshBalances();
      return tx;
    } catch (error) {
      console.error("Error executing swap:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addLiquidity = async (
    amountA: string,
    amountB: string,
    amountAMin: string,
    amountBMin: string
  ): Promise<ethers.ContractTransaction> => {
    if (
      !routerContract ||
      !signer ||
      !account ||
      !tokenAContract ||
      !tokenBContract
    ) {
      throw new Error("Missing required contracts or wallet connection");
    }

    setLoading(true);
    try {
      const parsedAmountA = ethers.utils.parseEther(amountA);
      const parsedAmountB = ethers.utils.parseEther(amountB);
      const parsedAmountAMin = ethers.utils.parseEther(amountAMin);
      const parsedAmountBMin = ethers.utils.parseEther(amountBMin);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // Approve token spending first
      await tokenAContract.approve(routerContract.address, parsedAmountA);
      await tokenBContract.approve(routerContract.address, parsedAmountB);

      // Add liquidity
      const tx = await routerContract.addLiquidity(
        CONTRACT_ADDRESSES.TokenA,
        CONTRACT_ADDRESSES.TokenB,
        parsedAmountA,
        parsedAmountB,
        parsedAmountAMin,
        parsedAmountBMin,
        account,
        deadline
      );

      await tx.wait();
      await refreshBalances();
      return tx;
    } catch (error) {
      console.error("Error adding liquidity:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeLiquidity = async (
    liquidity: string,
    amountAMin: string,
    amountBMin: string
  ): Promise<ethers.ContractTransaction> => {
    if (!routerContract || !signer || !account || !pairContract) {
      throw new Error("Missing required contracts or wallet connection");
    }

    setLoading(true);
    try {
      const parsedLiquidity = ethers.utils.parseEther(liquidity);
      const parsedAmountAMin = ethers.utils.parseEther(amountAMin);
      const parsedAmountBMin = ethers.utils.parseEther(amountBMin);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // Approve LP token spending first
      await pairContract.approve(routerContract.address, parsedLiquidity);

      // Remove liquidity
      const tx = await routerContract.removeLiquidity(
        CONTRACT_ADDRESSES.TokenA,
        CONTRACT_ADDRESSES.TokenB,
        parsedLiquidity,
        parsedAmountAMin,
        parsedAmountBMin,
        account,
        deadline
      );

      await tx.wait();
      await refreshBalances();
      return tx;
    } catch (error) {
      console.error("Error removing liquidity:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <DexContext.Provider
      value={{
        tokenA,
        tokenB,
        pairInfo,
        refreshBalances,
        calculateSwapAmount,
        executeSwap,
        addLiquidity,
        removeLiquidity,
        loading,
      }}
    >
      {children}
    </DexContext.Provider>
  );
};
