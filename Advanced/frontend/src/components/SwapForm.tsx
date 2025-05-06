"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useContext } from "react";
import { DexContext } from "../contexts/DexContext";
import { CONTRACT_ADDRESSES } from "../utils/contracts";
import { ArrowDownUp, RefreshCw } from "lucide-react";

const SwapForm: React.FC = () => {
  const { tokenA, tokenB, loading, calculateSwapAmount, executeSwap } =
    useContext(DexContext);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("0");
  const [tokenIn, setTokenIn] = useState(CONTRACT_ADDRESSES.TokenA);
  const [calculating, setCalculating] = useState(false);

  const handleSwap = async () => {
    try {
      const tokenOut =
        tokenIn === CONTRACT_ADDRESSES.TokenA
          ? CONTRACT_ADDRESSES.TokenB
          : CONTRACT_ADDRESSES.TokenA;
      await executeSwap(amountIn, "0", tokenIn, tokenOut);
      setAmountIn("");
      setAmountOut("0");
    } catch (error) {
      alert("Swap failed!");
    }
  };

  const handleSwitchTokens = () => {
    setTokenIn(
      tokenIn === CONTRACT_ADDRESSES.TokenA
        ? CONTRACT_ADDRESSES.TokenB
        : CONTRACT_ADDRESSES.TokenA
    );
    setAmountIn("");
    setAmountOut("0");
  };

  useEffect(() => {
    if (amountIn && tokenA && tokenB) {
      setCalculating(true);
      calculateSwapAmount(amountIn, tokenIn)
        .then(setAmountOut)
        .finally(() => setCalculating(false));
    } else {
      setAmountOut("0");
    }
  }, [amountIn, tokenIn, calculateSwapAmount, tokenA, tokenB]);

  const tokenInSymbol =
    tokenIn === CONTRACT_ADDRESSES.TokenA ? tokenA?.symbol : tokenB?.symbol;
  const tokenOutSymbol =
    tokenIn === CONTRACT_ADDRESSES.TokenA ? tokenB?.symbol : tokenA?.symbol;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl shadow-lg text-white border border-slate-700">
      <h2 className="text-xl font-bold mb-4">Swap Tokens</h2>

      <div className="space-y-4">
        <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">From</span>
            <button
              onClick={() =>
                setTokenIn(
                  tokenIn === CONTRACT_ADDRESSES.TokenA
                    ? CONTRACT_ADDRESSES.TokenB
                    : CONTRACT_ADDRESSES.TokenA
                )
              }
              className="px-3 py-1 bg-slate-600 rounded-full text-sm hover:bg-slate-500 transition-colors"
            >
              {tokenInSymbol || "Select"}
            </button>
          </div>
          <input
            type="number"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent text-xl font-medium focus:outline-none"
          />
        </div>

        <div className="flex justify-center -my-2 z-10 relative">
          <button
            onClick={handleSwitchTokens}
            className="bg-slate-700 hover:bg-slate-600 p-2 rounded-full border border-slate-600 transition-colors"
          >
            <ArrowDownUp className="h-5 w-5 text-slate-300" />
          </button>
        </div>

        <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">To (estimated)</span>
            <span className="text-slate-300">{tokenOutSymbol || "Token"}</span>
          </div>
          <div className="flex items-center">
            <div className="text-xl font-medium flex-1">
              {calculating ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-slate-400">Calculating...</span>
                </div>
              ) : (
                amountOut
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSwap}
          disabled={loading || !amountIn || calculating}
          className="w-full py-3 px-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg font-medium text-white 
                    hover:from-violet-600 hover:to-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Swapping..." : "Swap"}
        </button>
      </div>
    </div>
  );
};

export default SwapForm;
