import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { PrismLock, PrismLock__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PrismLock")) as PrismLock__factory;
  const prismLock = (await factory.deploy()) as PrismLock;
  const address = await prismLock.getAddress();
  return { prismLock, address };
}

describe("PrismLock", function () {
  let signers: Signers;

  before(async function () {
    const [deployer, alice, bob] = await ethers.getSigners();
    signers = { deployer, alice, bob };
  });

  beforeEach(function () {
    if (!fhevm.isMock) {
      this.skip();
    }
  });

  it("stores encrypted stakes and exposes metadata summaries", async function () {
    const { prismLock, address } = await deployFixture();
    const stakeValue = ethers.parseEther("1.5");
    const duration = 3n * 24n * 60n * 60n;

    await prismLock.connect(signers.alice).stake(duration, { value: stakeValue });
    const summary = await prismLock.getStakeSummary(signers.alice.address);

    expect(summary[5]).to.equal(true); // exists
    expect(summary[3]).to.equal(duration);

    const handle = summary[0];
    const clearAmount = await fhevm.userDecryptEuint(FhevmType.euint128, handle, address, signers.alice);
    expect(clearAmount).to.equal(stakeValue);
  });

  it("prevents overlapping stakes and rejects early withdrawals", async function () {
    const { prismLock } = await deployFixture();
    const stakeValue = ethers.parseEther("0.5");
    const duration = 5 * 24 * 60 * 60;

    await prismLock.connect(signers.alice).stake(duration, { value: stakeValue });
    await expect(prismLock.connect(signers.alice).stake(duration, { value: stakeValue })).to.be.revertedWithCustomError(
      prismLock,
      "StakeAlreadyActive",
    );

    await expect(prismLock.connect(signers.alice).requestWithdrawal()).to.be.revertedWithCustomError(
      prismLock,
      "LockPeriodActive",
    );
  });

  it("allows withdrawing once the public decryption proof is provided", async function () {
    const { prismLock } = await deployFixture();
    const stakeValue = ethers.parseEther("2");
    const duration = 2 * 24 * 60 * 60;

    await prismLock.connect(signers.alice).stake(duration, { value: stakeValue });
    await time.increase(duration + 1);
    await prismLock.connect(signers.alice).requestWithdrawal();

    const handle = await prismLock.getEncryptedAmount(signers.alice.address);
    await fhevm.initializeCLIApi();
    const publicDecryption = await fhevm.publicDecrypt([handle]);

    await expect(
      prismLock
        .connect(signers.alice)
        .finalizeWithdrawal(publicDecryption.abiEncodedClearValues, publicDecryption.decryptionProof),
    ).to.changeEtherBalances([signers.alice, prismLock], [stakeValue, -stakeValue]);
  });
});
