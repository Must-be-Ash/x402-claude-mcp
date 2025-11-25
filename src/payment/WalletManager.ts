import { createWalletClient, http, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia, mainnet, sepolia } from 'viem/chains';
import type { WalletConfig } from '../registry/types.js';
import { ConfigError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * WalletManager handles initialization and management of CDP embedded wallets
 */
export class WalletManager {
  private walletClient: WalletClient | null = null;

  /**
   * Initialize the wallet client from configuration
   * @param config Wallet configuration
   * @returns Initialized wallet client
   */
  async initialize(config: WalletConfig): Promise<WalletClient> {
    try {
      logger.debug('Initializing wallet', {
        provider: config.provider,
        network: config.network,
      });

      // Create account from private key
      const account = privateKeyToAccount(config.privateKey as `0x${string}`);

      // Map network name to viem chain
      const chain = this.getChain(config.network);

      // Get RPC URL for the network
      const rpcUrl = this.getRpcUrl(config.network);

      // Create wallet client
      this.walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl),
      });

      logger.info('Wallet initialized successfully', {
        address: account.address,
        network: config.network,
      });

      return this.walletClient;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigError(`Failed to initialize wallet: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get the initialized wallet client
   * @returns Wallet client instance
   */
  getWalletClient(): WalletClient {
    if (!this.walletClient) {
      throw new ConfigError('Wallet not initialized. Call initialize() first.');
    }
    return this.walletClient;
  }

  /**
   * Map network name to viem chain object
   */
  private getChain(network: string) {
    switch (network) {
      case 'base':
        return base;
      case 'base-sepolia':
        return baseSepolia;
      case 'ethereum':
        return mainnet;
      case 'sepolia':
        return sepolia;
      default:
        throw new ConfigError(`Unsupported network: ${network}`);
    }
  }

  /**
   * Get RPC URL for the network
   */
  private getRpcUrl(network: string): string {
    switch (network) {
      case 'base':
        return 'https://mainnet.base.org';
      case 'base-sepolia':
        return 'https://sepolia.base.org';
      case 'ethereum':
        return 'https://eth.llamarpc.com';
      case 'sepolia':
        return 'https://eth-sepolia.public.blastapi.io';
      default:
        throw new ConfigError(`Unsupported network: ${network}`);
    }
  }
}
