import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: '',
  projectId: '1d82aa8f4e3c93aea0f8ba6477892dfd',
  chains: [sepolia],
  ssr: false,
});
