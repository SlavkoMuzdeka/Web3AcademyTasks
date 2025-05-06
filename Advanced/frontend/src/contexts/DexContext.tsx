import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import { ethers } from "ethers";
import { Web3Context } from "./Web3Context";
import { CONTRACT_ADDRESSES } from "../utils/contracts";
import { TokenInfo, PairInfo, DexContextProps } from "../types";

export const DexContext = createContext<DexContextProps>({
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
  executeSwap: async () => ({} as ethers.TransactionResponse),
  addLiquidity: async () => ({} as ethers.TransactionResponse),
  removeLiquidity: async () => ({} as ethers.TransactionResponse),
  loading: false,
});

export const DexProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const {
    account,
    signer,
    routerContract,
    pairContract,
    tokenAContract,
    tokenBContract,
  } = useContext(Web3Context);
  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);
  const [pairInfo, setPairInfo] = useState<PairInfo>({
    reserveA: "0",
    reserveB: "0",
    lpTokenBalance: "0",
    totalSupply: "0",
  });
  const [loading, setLoading] = useState<boolean>(false);

  const refreshBalances = async () => {
    if (
      !account ||
      !signer ||
      !routerContract ||
      !pairContract ||
      !tokenAContract ||
      !tokenBContract
    )
      return;
    setLoading(true);
    try {
      const [nameA, symbolA, decimalsA, balanceA] = await Promise.all([
        tokenAContract.name(),
        tokenAContract.symbol(),
        tokenAContract.decimals(),
        tokenAContract.balanceOf(account),
      ]);
      setTokenA({
        address: CONTRACT_ADDRESSES.TokenA,
        name: nameA,
        symbol: symbolA,
        decimals: decimalsA,
        balance: ethers.formatUnits(balanceA, decimalsA),
      });

      const [nameB, symbolB, decimalsB, balanceB] = await Promise.all([
        tokenBContract.name(),
        tokenBContract.symbol(),
        tokenBContract.decimals(),
        tokenBContract.balanceOf(account),
      ]);
      setTokenB({
        address: CONTRACT_ADDRESSES.TokenB,
        name: nameB,
        symbol: symbolB,
        decimals: decimalsB,
        balance: ethers.formatUnits(balanceB, decimalsB),
      });

      const [reserveA, reserveB, lpTokenBalance, totalSupply] =
        await Promise.all([
          routerContract
            .getReserves(CONTRACT_ADDRESSES.TokenA, CONTRACT_ADDRESSES.TokenB)
            .then((res: any) => res[0]),
          routerContract
            .getReserves(CONTRACT_ADDRESSES.TokenA, CONTRACT_ADDRESSES.TokenB)
            .then((res: any) => res[1]),
          pairContract.balanceOf(account),
          pairContract.totalSupply(),
        ]);

      setPairInfo({
        reserveA: ethers.formatUnits(reserveA, decimalsA),
        reserveB: ethers.formatUnits(reserveB, decimalsB),
        lpTokenBalance: ethers.formatUnits(lpTokenBalance, 18),
        totalSupply: ethers.formatUnits(totalSupply, 18),
      });
    } catch (error) {
      console.error("Error refreshing balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSwapAmount = async (amountIn: string, tokenIn: string) => {
    if (!routerContract || !amountIn || parseFloat(amountIn) === 0) return "0";
    try {
      const tokenOutAddress =
        tokenIn === CONTRACT_ADDRESSES.TokenA
          ? CONTRACT_ADDRESSES.TokenB
          : CONTRACT_ADDRESSES.TokenA;
      const [reserveIn, reserveOut] = await routerContract.getReserves(
        tokenIn,
        tokenOutAddress
      );
      const parsedAmountIn = ethers.parseUnits(
        amountIn,
        tokenA?.decimals || 18
      );
      const amountOut = await routerContract.getAmountOut(
        parsedAmountIn,
        reserveIn,
        reserveOut
      );
      return ethers.formatUnits(amountOut, tokenB?.decimals || 18);
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
  ) => {
    if (!routerContract || !signer || !account)
      throw new Error("Missing contracts or wallet");
    setLoading(true);
    try {
      const parsedAmountIn = ethers.parseUnits(
        amountIn,
        tokenA?.decimals || 18
      );
      const parsedAmountOutMin = ethers.parseUnits(
        amountOutMin,
        tokenB?.decimals || 18
      );
      const path = [tokenIn, tokenOut];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const tokenContract =
        tokenIn === CONTRACT_ADDRESSES.TokenA ? tokenAContract : tokenBContract;
      await tokenContract?.approve(routerContract.address, parsedAmountIn);

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
    } finally {
      setLoading(false);
    }
  };

  const addLiquidity = async (
    amountA: string,
    amountB: string,
    amountAMin: string,
    amountBMin: string
  ) => {
    if (
      !routerContract ||
      !signer ||
      !account ||
      !tokenAContract ||
      !tokenBContract
    )
      throw new Error("Missing contracts or wallet");
    setLoading(true);
    try {
      const parsedAmountA = ethers.parseUnits(amountA, tokenA?.decimals || 18);
      const parsedAmountB = ethers.parseUnits(amountB, tokenB?.decimals || 18);
      const parsedAmountAMin = ethers.parseUnits(
        amountAMin,
        tokenA?.decimals || 18
      );
      const parsedAmountBMin = ethers.parseUnits(
        amountBMin,
        tokenB?.decimals || 18
      );
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await Promise.all([
        tokenAContract.approve(routerContract.address, parsedAmountA),
        tokenBContract.approve(routerContract.address, parsedAmountB),
      ]);

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
    } finally {
      setLoading(false);
    }
  };

  const removeLiquidity = async (
    liquidity: string,
    amountAMin: string,
    amountBMin: string
  ) => {
    if (!routerContract || !signer || !account || !pairContract)
      throw new Error("Missing contracts or wallet");
    setLoading(true);
    try {
      const parsedLiquidity = ethers.parseUnits(liquidity, 18);
      const parsedAmountAMin = ethers.parseUnits(
        amountAMin,
        tokenA?.decimals || 18
      );
      const parsedAmountBMin = ethers.parseUnits(
        amountBMin,
        tokenB?.decimals || 18
      );
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await pairContract.approve(routerContract.address, parsedLiquidity);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account && tokenAContract && tokenBContract) refreshBalances();
  }, [account, tokenAContract, tokenBContract]);

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
