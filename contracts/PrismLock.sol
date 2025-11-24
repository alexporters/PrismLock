// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint128} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PrismLock
/// @notice Time-locked ETH vault that stores stake balances as encrypted values.
contract PrismLock is ZamaEthereumConfig {
    uint64 public constant MIN_LOCK_DURATION = 1 days;
    uint64 public constant MAX_LOCK_DURATION = 365 days;

    struct StakeData {
        euint128 encryptedAmount;
        uint64 lockDuration;
        uint64 startTimestamp;
        bool withdrawalRequested;
        bool exists;
    }

    struct StakeSummary {
        bytes32 encryptedAmount;
        uint256 startTimestamp;
        uint256 unlockTimestamp;
        uint64 lockDuration;
        bool withdrawalRequested;
        bool exists;
    }

    mapping(address => StakeData) private _stakes;

    event StakeCreated(address indexed user, uint256 amount, uint64 lockDuration, bytes32 encryptedAmount);
    event WithdrawalRequested(address indexed user, bytes32 encryptedAmount);
    event WithdrawalFinalized(address indexed user, uint256 amount, bytes32 encryptedAmount);

    error StakeAlreadyActive();
    error InvalidLockDuration();
    error InvalidStakeAmount();
    error StakeAmountTooLarge();
    error NoActiveStake();
    error LockPeriodActive();
    error WithdrawalAlreadyRequested();
    error WithdrawalNotRequested();

    /// @notice Locks ETH for a selected duration and stores the value as an encrypted amount.
    /// @param lockDurationSeconds Staking duration expressed in seconds.
    function stake(uint64 lockDurationSeconds) external payable {
        if (_stakes[msg.sender].exists) {
            revert StakeAlreadyActive();
        }
        if (lockDurationSeconds < MIN_LOCK_DURATION || lockDurationSeconds > MAX_LOCK_DURATION) {
            revert InvalidLockDuration();
        }
        if (msg.value == 0) {
            revert InvalidStakeAmount();
        }
        if (msg.value > type(uint128).max) {
            revert StakeAmountTooLarge();
        }

        uint128 clearAmount = uint128(msg.value);
        euint128 encryptedAmount = FHE.asEuint128(clearAmount);

        _stakes[msg.sender] = StakeData({
            encryptedAmount: encryptedAmount,
            lockDuration: lockDurationSeconds,
            startTimestamp: uint64(block.timestamp),
            withdrawalRequested: false,
            exists: true
        });

        FHE.allow(encryptedAmount, msg.sender);
        FHE.allowThis(encryptedAmount);

        emit StakeCreated(msg.sender, clearAmount, lockDurationSeconds, FHE.toBytes32(encryptedAmount));
    }

    /// @notice Returns the full stake summary for any account.
    function getStakeSummary(address user) external view returns (StakeSummary memory summary) {
        StakeData storage data = _stakes[user];
        uint256 unlockTimestamp = data.exists ? uint256(data.startTimestamp) + data.lockDuration : 0;
        bytes32 encryptedAmount = data.exists ? FHE.toBytes32(data.encryptedAmount) : bytes32(0);

        summary = StakeSummary({
            encryptedAmount: encryptedAmount,
            startTimestamp: data.exists ? uint256(data.startTimestamp) : 0,
            unlockTimestamp: unlockTimestamp,
            lockDuration: data.lockDuration,
            withdrawalRequested: data.withdrawalRequested,
            exists: data.exists
        });
    }

    /// @notice Returns the encrypted amount handle for an account.
    function getEncryptedAmount(address user) external view returns (bytes32) {
        StakeData storage data = _stakes[user];
        if (!data.exists) {
            return bytes32(0);
        }
        return FHE.toBytes32(data.encryptedAmount);
    }

    /// @notice Indicates whether the address currently has an active stake.
    function hasStake(address user) external view returns (bool) {
        return _stakes[user].exists;
    }

    /// @notice Marks the stake as ready for public decryption once the lock period is over.
    function requestWithdrawal() external {
        StakeData storage data = _stakes[msg.sender];
        if (!data.exists) {
            revert NoActiveStake();
        }
        if (block.timestamp < uint256(data.startTimestamp) + data.lockDuration) {
            revert LockPeriodActive();
        }
        if (data.withdrawalRequested) {
            revert WithdrawalAlreadyRequested();
        }

        data.withdrawalRequested = true;
        FHE.makePubliclyDecryptable(data.encryptedAmount);

        emit WithdrawalRequested(msg.sender, FHE.toBytes32(data.encryptedAmount));
    }

    /// @notice Finalizes a withdrawal using the relayer-generated public decryption proof.
    /// @param abiEncodedCleartexts ABI-encoded decrypted value returned by the relayer.
    /// @param decryptionProof Proof of correctness for the decrypted value.
    function finalizeWithdrawal(bytes calldata abiEncodedCleartexts, bytes calldata decryptionProof) external {
        StakeData storage data = _stakes[msg.sender];
        if (!data.exists) {
            revert NoActiveStake();
        }
        if (!data.withdrawalRequested) {
            revert WithdrawalNotRequested();
        }

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(data.encryptedAmount);

        FHE.checkSignatures(handles, abiEncodedCleartexts, decryptionProof);

        uint128 decryptedAmount = abi.decode(abiEncodedCleartexts, (uint128));

        delete _stakes[msg.sender];

        (bool sent, ) = msg.sender.call{value: uint256(decryptedAmount)}("");
        require(sent, "ETH transfer failed");

        emit WithdrawalFinalized(msg.sender, decryptedAmount, handles[0]);
    }
}
