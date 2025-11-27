import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Contract, parseEther } from 'ethers';
import { useAccount } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import '../styles/StakeForm.css';

const SECONDS_IN_DAY = 24 * 60 * 60;

export function StakeForm() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();

  const [amount, setAmount] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const isFormDisabled = useMemo(() => {
    return !address || !amount || Number(amount) <= 0 || Number(durationDays) < 1;
  }, [address, amount, durationDays]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isFormDisabled || !signerPromise) {
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage('');
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Wallet not found. Please reconnect.');
      }

      const stakeContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const durationSeconds = BigInt(Math.floor(Number(durationDays)) * SECONDS_IN_DAY);
      const stakeValue = parseEther(amount);

      const tx = await stakeContract.stake(durationSeconds, { value: stakeValue });
      setStatusMessage('Waiting for confirmation...');
      await tx.wait();
      setStatusMessage('Stake created successfully!');
      setAmount('');
    } catch (error) {
      console.error('Stake failed', error);
      setStatusMessage(
        error instanceof Error ? `Stake failed: ${error.message}` : 'Stake failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="stake-form-card">
      <header className="stake-form-header">
        <div>
          <h2>Create a private stake</h2>
          <p>Lock ETH for 1-365 days. The contract stores the amount through Zama FHE handles.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="stake-form">
        <label className="form-field">
          <span>Amount (ETH)</span>
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="e.g. 0.50"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Lock duration (days)</span>
          <input
            type="number"
            min="1"
            max="365"
            value={durationDays}
            onChange={(event) => setDurationDays(event.target.value)}
          />
          <small>Minimum: 1 day. Maximum: 365 days.</small>
        </label>

        <button type="submit" disabled={isFormDisabled || isSubmitting} className="stake-submit">
          {!address ? 'Connect wallet to continue' : isSubmitting ? 'Submitting...' : 'Create stake'}
        </button>
      </form>

      {statusMessage && (
        <div className="stake-status">
          <p>{statusMessage}</p>
        </div>
      )}
    </section>
  );
}
