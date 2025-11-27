import { useMemo, useState } from 'react';
import { Contract, formatEther } from 'ethers';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/StakeOverview.css';

const ZERO_HANDLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

type StakeSummary = {
  encryptedAmount: string;
  startTimestamp: number;
  unlockTimestamp: number;
  lockDuration: number;
  withdrawalRequested: boolean;
  exists: boolean;
};

function formatTimestamp(timestamp: number) {
  if (!timestamp) return '—';
  return new Date(timestamp * 1000).toLocaleString();
}

export function StakeOverview() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [privateAmount, setPrivateAmount] = useState('');
  const [publicAmount, setPublicAmount] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isRequestingUnlock, setIsRequestingUnlock] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const summaryResult = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getStakeSummary',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  const summary: StakeSummary | null = useMemo(() => {
    const data = summaryResult.data;
    if (!data) {
      return null;
    }

    const raw =
      Array.isArray(data) || typeof data === 'object'
        ? (data as Record<string | number, unknown>)
        : null;

    if (!raw) {
      return null;
    }

    const encryptedAmount = (raw as Record<string | number, unknown>).encryptedAmount ?? raw[0];
    const start = raw.startTimestamp ?? raw[1];
    const unlock = raw.unlockTimestamp ?? raw[2];
    const duration = raw.lockDuration ?? raw[3];
    const requested = raw.withdrawalRequested ?? raw[4];
    const exists = raw.exists ?? raw[5];

    if (typeof encryptedAmount !== 'string') {
      return null;
    }

    return {
      encryptedAmount,
      startTimestamp: Number(start ?? 0),
      unlockTimestamp: Number(unlock ?? 0),
      lockDuration: Number(duration ?? 0),
      withdrawalRequested: Boolean(requested),
      exists: Boolean(exists),
    };
  }, [summaryResult.data]);

  const handlePrivateDecrypt = async () => {
    if (!instance || !address || !summary || summary.encryptedAmount === ZERO_HANDLE || !signerPromise) {
      setStatusMessage('Stake not found or wallet unavailable.');
      return;
    }

    try {
      setIsDecrypting(true);
      setStatusMessage('');
      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not ready.');

      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        { handle: summary.encryptedAmount, contractAddress: CONTRACT_ADDRESS },
      ];

      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const eip712 = instance.createEIP712(keypair.publicKey, [CONTRACT_ADDRESS], startTimestamp, durationDays);

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        [CONTRACT_ADDRESS],
        address,
        startTimestamp,
        durationDays
      );

      const decrypted = result[summary.encryptedAmount];
      setPrivateAmount(formatEther(BigInt(decrypted)));
      setStatusMessage('Decrypted amount shown above.');
    } catch (error) {
      console.error('Private decrypt failed', error);
      setStatusMessage(
        error instanceof Error ? `Decryption failed: ${error.message}` : 'Decryption failed. Please try again.'
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  const requestUnlock = async () => {
    if (!signerPromise || !summary || !summary.exists) {
      setStatusMessage('Stake not found.');
      return;
    }
    try {
      setIsRequestingUnlock(true);
      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not ready.');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.requestWithdrawal();
      setStatusMessage('Requesting unlock...');
      await tx.wait();
      if (summaryResult.refetch) {
        await summaryResult.refetch();
      }
      setStatusMessage('Unlock requested successfully.');
    } catch (error) {
      console.error('requestWithdrawal failed', error);
      setStatusMessage(
        error instanceof Error ? `Unlock failed: ${error.message}` : 'Unlock failed. Please try again.'
      );
    } finally {
      setIsRequestingUnlock(false);
    }
  };

  const finalizeWithdrawal = async () => {
    if (!instance || !signerPromise || !summary || summary.encryptedAmount === ZERO_HANDLE) {
      setStatusMessage('Cannot finalize withdrawal yet.');
      return;
    }
    try {
      setIsFinalizing(true);
      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not ready.');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const proofResult = await instance.publicDecrypt([summary.encryptedAmount]);
      const value = proofResult.clearValues[summary.encryptedAmount];
      setPublicAmount(formatEther(BigInt(value)));

      const tx = await contract.finalizeWithdrawal(
        proofResult.abiEncodedClearValues,
        proofResult.decryptionProof
      );
      setStatusMessage('Submitting withdrawal...');
      await tx.wait();
      if (summaryResult.refetch) {
        await summaryResult.refetch();
      }
      setStatusMessage('Withdrawal finalized!');
      setPrivateAmount('');
    } catch (error) {
      console.error('finalizeWithdrawal failed', error);
      setStatusMessage(
        error instanceof Error ? `Finalize failed: ${error.message}` : 'Finalize failed. Please try again.'
      );
    } finally {
      setIsFinalizing(false);
    }
  };

  if (!address) {
    return (
      <section className="stake-overview-card">
        <p>Please connect your wallet to see stake information.</p>
      </section>
    );
  }

  if (!summary?.exists) {
    return (
      <section className="stake-overview-card">
        <h3>No stake detected</h3>
        <p>Create a stake in the other tab, then return here to monitor it.</p>
      </section>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const unlockReady = now >= summary.unlockTimestamp;

  return (
    <section className="stake-overview-card">
      <header>
        <div>
          <h2>My Vault</h2>
          <p>Track the encrypted handle and control the withdrawal flow.</p>
        </div>
      </header>

      <div className="overview-grid">
        <div>
          <p className="label">Encrypted handle</p>
          <p className="value">{summary.encryptedAmount.slice(0, 18)}...</p>
        </div>
        <div>
          <p className="label">Start</p>
          <p className="value">{formatTimestamp(summary.startTimestamp)}</p>
        </div>
        <div>
          <p className="label">Unlock at</p>
          <p className="value">{formatTimestamp(summary.unlockTimestamp)}</p>
        </div>
        <div>
          <p className="label">Status</p>
          <p className="value">
            {summary.withdrawalRequested ? 'Waiting for finalization' : unlockReady ? 'Ready to unlock' : 'Locked'}
          </p>
        </div>
      </div>

      <div className="actions">
        <button className="secondary" onClick={handlePrivateDecrypt} disabled={isDecrypting || zamaLoading}>
          {isDecrypting ? 'Decrypting...' : 'Decrypt privately'}
        </button>

        <button
          className="secondary"
          onClick={requestUnlock}
          disabled={!unlockReady || summary.withdrawalRequested || isRequestingUnlock}
        >
          {isRequestingUnlock ? 'Requesting...' : 'Request unlock'}
        </button>

        <button
          className="primary"
          onClick={finalizeWithdrawal}
          disabled={!summary.withdrawalRequested || isFinalizing}
        >
          {isFinalizing ? 'Finalizing...' : 'Finalize withdrawal'}
        </button>
      </div>

      {(privateAmount || publicAmount) && (
        <div className="amounts">
          {privateAmount && (
            <p>
              Private amount: <span>{privateAmount} ETH</span>
            </p>
          )}
          {publicAmount && (
            <p>
              Public proof amount: <span>{publicAmount} ETH</span>
            </p>
          )}
        </div>
      )}

      <div className="status-row">
        {statusMessage && <p>{statusMessage}</p>}
        {zamaError && <p className="error-text">{zamaError}</p>}
      </div>
    </section>
  );
}
