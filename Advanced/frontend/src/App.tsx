import React from "react";
import SwapForm from "./components/SwapForm";
import { DexProvider } from "./contexts/DexContext";
import { Web3Provider } from "./contexts/Web3Context";
import LiquidityForm from "./components/LiquidityForm";
import BalanceDisplay from "./components/BalanceDisplay";
import ConnectWalletButton from "./components/ConnectWalletButton";

const App: React.FC = () => {
  return (
    <Web3Provider>
      <DexProvider>
        <div className="max-w-2xl mx-auto p-4">
          <h1 className="text-3xl font-bold mb-6 text-center">Mini DEX</h1>
          <ConnectWalletButton />
          <BalanceDisplay />
          <SwapForm />
          <LiquidityForm />
        </div>
      </DexProvider>
    </Web3Provider>
  );
};

export default App;
