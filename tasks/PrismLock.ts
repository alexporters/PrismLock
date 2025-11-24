import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the PrismLock address").setAction(async function (_args: TaskArguments, hre) {
  const deployment = await hre.deployments.get("PrismLock");
  console.log(`PrismLock address: ${deployment.address}`);
});

task("task:stake", "Stake ETH into PrismLock")
  .addParam("value", "Amount of ETH to stake (example: 0.25)")
  .addParam("duration", "Lock duration in seconds")
  .addOptionalParam("contract", "Override PrismLock contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployment = args.contract ? { address: args.contract } : await deployments.get("PrismLock");
    const stakeValue = ethers.parseEther(String(args.value));
    const lockDuration = BigInt(args.duration);

    const [signer] = await ethers.getSigners();
    const prismLock = await ethers.getContractAt("PrismLock", deployment.address);
    const tx = await prismLock.connect(signer).stake(lockDuration, { value: stakeValue });
    console.log(`Staking ${args.value} ETH for ${lockDuration} seconds... tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Confirmed in block ${receipt?.blockNumber}`);
  });

task("task:show-stake", "Displays stake information and decrypts it locally")
  .addOptionalParam("contract", "Override PrismLock contract address")
  .addOptionalParam("account", "Signer index to inspect", "0")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = args.contract ? { address: args.contract } : await deployments.get("PrismLock");
    const signerIndex = parseInt(String(args.account));
    const signers = await ethers.getSigners();
    const signer = signers[signerIndex];
    if (!signer) {
      throw new Error(`No signer found at index ${signerIndex}`);
    }

    const prismLock = await ethers.getContractAt("PrismLock", deployment.address);
    const summary = await prismLock.getStakeSummary(signer.address);
    console.log(`Stake exists: ${summary[5]}`);
    console.log(`Start: ${summary[1]}  Unlock: ${summary[2]}  Duration: ${summary[3]} seconds`);
    console.log(`Public decryption requested: ${summary[4]}`);

    const handle = summary[0];
    if (handle === ethers.ZeroHash) {
      console.log("No encrypted amount stored for this account.");
      return;
    }

    const clearAmount = await fhevm.userDecryptEuint(FhevmType.euint128, handle, deployment.address, signer);
    console.log(`Decrypted stake amount: ${ethers.formatEther(clearAmount)} ETH`);
  });

task("task:request-withdraw", "Requests a withdrawal once the lock period is over")
  .addOptionalParam("contract", "Override PrismLock contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployment = args.contract ? { address: args.contract } : await deployments.get("PrismLock");
    const [signer] = await ethers.getSigners();
    const prismLock = await ethers.getContractAt("PrismLock", deployment.address);
    const tx = await prismLock.connect(signer).requestWithdrawal();
    console.log(`requestWithdrawal transaction: ${tx.hash}`);
    await tx.wait();
    console.log("Withdrawal request submitted.");
  });

task("task:finalize-withdraw", "Performs public decryption and finalizes the withdrawal")
  .addOptionalParam("contract", "Override PrismLock contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = args.contract ? { address: args.contract } : await deployments.get("PrismLock");
    const [signer] = await ethers.getSigners();
    const prismLock = await ethers.getContractAt("PrismLock", deployment.address);

    const handle = await prismLock.getEncryptedAmount(signer.address);
    if (handle === ethers.ZeroHash) {
      throw new Error("No encrypted stake found. Did you stake and request withdrawal?");
    }

    const publicDecryption = await fhevm.publicDecrypt([handle]);
    const abiEncoded = publicDecryption.abiEncodedClearValues;
    const proof = publicDecryption.decryptionProof;

    const clearValues = publicDecryption.clearValues as Record<string, bigint>;
    const decryptedAmount = clearValues[handle];
    console.log(`Decrypted amount: ${ethers.formatEther(decryptedAmount)} ETH`);

    const tx = await prismLock.connect(signer).finalizeWithdrawal(abiEncoded, proof);
    console.log(`finalizeWithdrawal transaction: ${tx.hash}`);
    await tx.wait();
    console.log("Withdrawal finalized.");
  });
