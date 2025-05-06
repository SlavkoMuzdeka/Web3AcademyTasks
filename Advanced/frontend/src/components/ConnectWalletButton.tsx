import React from "react";
import { useContext } from "react";
import { Web3Context } from "../contexts/Web3Context";

const ConnectWalletButton: React.FC = () => {
  const { connectWallet, account } = useContext(Web3Context);
  return (
    <button
      onClick={connectWallet}
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    >
      {account
        ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`
        : "Connect Wallet"}
    </button>
  );
};

export default ConnectWalletButton;
