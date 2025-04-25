# ERC20 and ERC721 deployment with Foundry
This project is a beginner-level exploration of Ethereum smart contract development using the `Foundry` toolkit. As part of the [`Web3 Academy`](https://web3.ain.rs/index.html), I created and deployed two smart contracts to the `Sepolia` testnet:

- An `ERC20` token (fungible — like `cryptocurrencies`)
- An `ERC721` token (non-fungible — like `NFTs`)

These contracts are located in the `src/` folder and are deployed using scripts from the `script/` directory.

## What Are ERC20 and ERC721?

- `ERC20` is a standard interface for fungible tokens — meaning each token is identical and interchangeable with others.

- `ERC721` is a standard for `NFTs`, where each token is unique and non-interchangeable.

My tokens uses OpenZeppelin Contracts, a library of secure and widely adopted smart contract implementations.

To install the `OpenZeppelin` library:

```bash
forge install openzeppelin/openzeppelin-contracts
```

## Deploying Smart Contracts to Sepolia

### 1. Get `Sepolia ETH`

To deploy, you’ll need some `ETH` on the `Sepolia testnet`. You can request it from a `Sepolia` faucet.

### 2. Setup your wallet in `Foundry`

Securely import your deployer account (you’ll be prompted to input your private key and create a password):

```bash
cast wallet import deployer --interactive
```
⚠️**NOTE**: Do `not share` or `commit` your private key to any public repository.

Confirm it's been imported:

```bash
cast wallet list
```

### 3. Configure Environment Variables

Create a `.env` file and add:

```env
SEPOLIA_URL="https://sepolia.infura.io/v3/your_project_id"
SEPOLIA_KEY="your_etherscan_api_key"
```

You can use `Infura` or `Alchemy` to get an `RPC URL`, and generate an `API` key by registering on `Etherscan`.