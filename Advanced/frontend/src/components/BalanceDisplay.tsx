import React from "react";
import { useContext } from "react";
import { DexContext } from "../contexts/DexContext";

const BalanceDisplay: React.FC = () => {
  const { tokenA, tokenB, pairInfo } = useContext(DexContext);
  return (
    <div className="bg-gray-100 p-4 rounded shadow mt-4">
      <h2 className="text-xl mb-2">Balances</h2>
      <p>
        {tokenA?.symbol}: {tokenA?.balance}
      </p>
      <p>
        {tokenB?.symbol}: {tokenB?.balance}
      </p>
      <p>
        Reserves - {tokenA?.symbol}: {pairInfo.reserveA}, {tokenB?.symbol}:{" "}
        {pairInfo.reserveB}
      </p>
    </div>
  );
};

export default BalanceDisplay;
