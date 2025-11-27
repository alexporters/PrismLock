# PrismLock

PrismLock is a privacy-preserving, time-locked ETH vault. Users lock ETH for a chosen duration while the deposited amount stays encrypted on-chain through Zama's FHEVM. When the lock expires, a relayer proves the clear amount so the user can withdraw. Reads use viem for efficiency; writes use ethers to align with RainbowKit wallet flow.

## Why PrismLock

- Protects financial privacy by storing encrypted balances instead of public amounts.
- Enforces deterministic unlock timing with a simple, auditable state machine.
- Verifies relayer-generated public decryption proofs before releasing funds.
- Wallet-native UX: RainbowKit + wagmi for connection, no local storage, no localhost network dependency.
- ABI-driven UI to avoid drift between contract and frontend.

## Problem We Solve

Traditional staking and vault contracts expose deposit sizes and timing, leaking strategy and user behavior. PrismLock keeps the amount encrypted while still enabling:

- Time-bound availability windows enforced on-chain.
- Trustless withdrawal with relayer proofs instead of trusting an off-chain party.
- Optional private preview of the amount without revealing it publicly.

## Core Features

- **Encrypted staking**: deposit ETH; only an encrypted handle is stored.
- **Configurable lock duration**: bounded by `MIN_LOCK_DURATION` and `MAX_LOCK_DURATION`.
- **Two-step withdrawal**: request unlock after the timer, then finalize with a verified decryption proof.
- **Private decrypt**: local decryption in the UI so users can view their stake without publishing it.
- **Auto-refresh overview**: polling keeps stake status up to date.

## Architecture at a Glance

- **Smart contract** (`contracts/PrismLock.sol`): manages encrypted stakes with `@fhevm/solidity`, enforces timing, and verifies decryption proofs.
- **Relayer integration**: `@zama-fhe/relayer-sdk` handles public decrypt proof generation and client-side private decrypt.
- **Frontend** (`src/`): Vite + React; viem for reads, ethers for writes; RainbowKit for wallet connect; plain CSS (no Tailwind).
- **Artifacts**: canonical ABIs live in `deployments/` (e.g., `deployments/sepolia`); the frontend imports the generated ABI in `src/src/config/contracts.ts`.

## Tech Stack

- Solidity 0.8.24, TypeScript, React 19.
- Hardhat, hardhat-deploy, TypeChain (ethers v6), ts-node.
- Zama FHE: `@fhevm/solidity`, `@zama-fhe/relayer-sdk`, Zama Ethereum config.
- Frontend: Vite, RainbowKit, wagmi/viem (reads), ethers (writes), CSS modules.
- Testing: Hardhat network helpers, mocha, chai.
- Runtime: Node.js 20+, npm.

## Repository Layout

- `contracts/` – PrismLock contract and FHE logic.
- `deploy/` – Hardhat deployment scripts.
- `deployments/` – generated addresses and ABIs (use these for the frontend).
- `tasks/` – Hardhat tasks for manual interactions.
- `test/` – contract tests.
- `src/` – frontend app; React source is under `src/src/`.
- `docs/` – Zama protocol and relayer references.

## Smart Contract Overview

- `stake(uint64 lockDurationSeconds)` – lock ETH with FHE encryption, storing an encrypted handle.
- `getStakeSummary(address user)` – returns encrypted handle, start/unlock timestamps, duration, withdrawal flag, and existence flag.
- `requestWithdrawal()` – after the lock, marks the stake as ready and makes the encrypted value publicly decryptable.
- `finalizeWithdrawal(bytes abiEncodedCleartexts, bytes decryptionProof)` – verifies a relayer proof, decodes the clear amount, and releases ETH.
- Guardrails: prevents overlapping stakes, enforces duration bounds, caps to `uint128`, and verifies signatures for public decrypt.

## Frontend Overview

- Wallet connection via RainbowKit; network targets testnet/mainnet RPC (no localhost).
- Stake creation with ETH input and lock duration selection.
- Live stake overview: encrypted handle, start/unlock times, lock status, and withdrawal progress.
- Private decrypt flow with typed-data signing to view the amount locally.
- Unlock flow: request withdrawal when eligible, then finalize with the relayer proof and see the decrypted public amount.

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- RPC access (Infura recommended) and a funded account for Sepolia or the chosen network.

### Install Dependencies

```bash
# Root (contracts and tooling)
npm install

# Frontend
cd src
npm install
```

### Environment

Create a root `.env` for Hardhat:

```
INFURA_API_KEY=your_infura_project_id
PRIVATE_KEY=your_deployment_private_key
ETHERSCAN_API_KEY=optional_for_verification
```

- Deployment uses `PRIVATE_KEY`; do not use a mnemonic.
- `dotenv` is loaded in Hardhat config; ensure the variables are set before deploying.
- The frontend does not rely on environment variables.

## Development Workflow

### Contracts

```bash
# Compile
npm run compile

# Run tests on Hardhat network
npm run test

# Start a local FHE-ready node (for contract testing)
npm run chain

# Deploy to localhost (contract-only flows)
npm run deploy:localhost
```

### Deploy to Sepolia

```bash
# Uses INFURA_API_KEY and PRIVATE_KEY from .env
npm run deploy:sepolia

# (Optional) verify
npm run verify:sepolia -- --contract contracts/PrismLock.sol:PrismLock <DEPLOYED_ADDRESS>
```

Deployment artifacts are written to `deployments/sepolia`. Treat them as the single source of truth for addresses and ABIs.

### Frontend

```bash
cd src
npm run dev       # start Vite dev server
npm run build     # production build
npm run lint      # lint frontend code
```

- The frontend is wired to the generated ABI/address in `src/src/config/contracts.ts`. After redeploying the contract, update this file with the latest data from `deployments/sepolia/PrismLock.json` and rebuild.
- Styling is plain CSS; Tailwind is not used.

## Using the Dapp

1. Connect a wallet with RainbowKit on the configured network.
2. Stake ETH: choose a lock duration within allowed bounds and submit.
3. Monitor: check the encrypted handle, timestamps, and status in the Stake Overview.
4. Private decrypt (optional): sign the typed-data request to view the amount locally without publishing it.
5. Request unlock: once the lock expires, call `requestWithdrawal` to make the value publicly decryptable.
6. Finalize withdrawal: submit the relayer proof to release ETH; the UI shows both private and public amounts for clarity.

## Syncing ABI and Address to the Frontend

1. Deploy (`npm run deploy:sepolia`).
2. Copy the new address and ABI from `deployments/sepolia/PrismLock.json`.
3. Update `src/src/config/contracts.ts` to match the generated ABI and address exactly.
4. Rebuild the frontend (`cd src && npm run build`) to confirm compatibility.

## Advantages and Design Choices

- End-to-end encrypted balances with FHEVM.
- Deterministic timing and minimal state transitions for easy auditing.
- Separation of reads (viem) and writes (ethers) to optimize UX and wallet support.
- ABI-driven frontend to prevent drift between on-chain contracts and the UI.
- Plain CSS and lean dependencies to reduce bundle size and audit surface.

## Roadmap

- Support multiple concurrent stakes per user with aggregated summaries.
- Configurable relayer endpoints and health checks.
- Analytics for lock duration distribution and unlock queue visibility (without exposing amounts).
- Hardware wallet validation and additional network presets.
- Gas optimizations and broader test coverage on edge cases.

## Troubleshooting

- **ABI mismatch or tuple errors**: regenerate and copy the ABI from `deployments/<network>/PrismLock.json` into `src/src/config/contracts.ts`, then rebuild.
- **RPC or network issues**: verify `INFURA_API_KEY`, wallet network, and deployed address alignment.
- **Withdrawal blocked**: ensure the lock period has elapsed and `requestWithdrawal` was called before `finalizeWithdrawal`.

## License

BSD-3-Clause-Clear. See `LICENSE` for details.
