import { useState } from 'react';
import { Header } from './Header';
import { StakeForm } from './StakeForm';
import { StakeOverview } from './StakeOverview';
import '../styles/PrismLockApp.css';

export function PrismLockApp() {
  const [activeTab, setActiveTab] = useState<'stake' | 'overview'>('stake');

  return (
    <div className="prism-app">
      <Header />
      <main className="app-content">
        <div className="tab-navigation">
          <button
            onClick={() => setActiveTab('stake')}
            className={`tab-button ${activeTab === 'stake' ? 'active' : ''}`}
          >
            Create Stake
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          >
            My Vault
          </button>
        </div>
        {activeTab === 'stake' ? <StakeForm /> : <StakeOverview />}
      </main>
    </div>
  );
}
