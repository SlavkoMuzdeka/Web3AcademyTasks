import React, { useState } from "react";
import { useContext } from "react";
import { DexContext } from "../contexts/DexContext";

const LiquidityForm: React.FC = () => {
  const { loading, addLiquidity, removeLiquidity } = useContext(DexContext);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [liquidity, setLiquidity] = useState("");

  const handleAddLiquidity = async () => {
    try {
      await addLiquidity(amountA, amountB, "0", "0");
      setAmountA("");
      setAmountB("");
    } catch (error) {
      alert("Add liquidity failed!");
    }
  };

  const handleRemoveLiquidity = async () => {
    try {
      await removeLiquidity(liquidity, "0", "0");
      setLiquidity("");
    } catch (error) {
      alert("Remove liquidity failed!");
    }
  };

  return (
    <div className="bg-gray-100 p-4 rounded shadow mt-4">
      <h2 className="text-xl mb-4">Manage Liquidity</h2>
      <div className="mb-4">
        <input
          type="number"
          value={amountA}
          onChange={(e) => setAmountA(e.target.value)}
          placeholder="Token A Amount"
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="number"
          value={amountB}
          onChange={(e) => setAmountB(e.target.value)}
          placeholder="Token B Amount"
          className="w-full p-2 border rounded"
        />
        <button
          onClick={handleAddLiquidity}
          disabled={loading || !amountA || !amountB}
          className="bg-blue-500 text-white px-4 py-2 rounded mt-2 hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? "Adding..." : "Add Liquidity"}
        </button>
      </div>
      <div>
        <input
          type="number"
          value={liquidity}
          onChange={(e) => setLiquidity(e.target.value)}
          placeholder="LP Amount to Remove"
          className="w-full p-2 border rounded mb-2"
        />
        <button
          onClick={handleRemoveLiquidity}
          disabled={loading || !liquidity}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
        >
          {loading ? "Removing..." : "Remove Liquidity"}
        </button>
      </div>
    </div>
  );
};

export default LiquidityForm;
