import type { WalletClient } from 'viem';
import { wrapFetchWithPayment, createSigner } from 'x402-fetch';
import type { Endpoint, EndpointCallResult } from '../registry/types.js';
import { PaymentError, NetworkError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { retryWithBackoff } from '../utils/retry.js';

/**
 * PaymentHandler manages x402 payment flows using CDP wallet
 */
export class PaymentHandler {
  private walletClient: WalletClient;
  private wrappedFetch: typeof fetch;

  /**
   * Private constructor - use create() factory method instead
   */
  private constructor(walletClient: WalletClient, wrappedFetch: typeof fetch) {
    this.walletClient = walletClient;
    this.wrappedFetch = wrappedFetch;
  }

  /**
   * Create a new PaymentHandler with async initialization
   * @param walletClient Viem wallet client
   * @param network Network name (for x402 signer)
   * @param privateKey Private key (for x402 signer)
   * @returns Initialized PaymentHandler
   */
  static async create(
    walletClient: WalletClient,
    network: string,
    privateKey: string
  ): Promise<PaymentHandler> {
    // Create signer from network and private key
    const signer = await createSigner(network, privateKey);

    // Wrap fetch with x402 payment support
    const wrappedFetch = wrapFetchWithPayment(fetch, signer);

    return new PaymentHandler(walletClient, wrappedFetch);
  }

  /**
   * Call an x402-protected endpoint with automatic payment handling
   * @param endpoint Endpoint configuration
   * @param params Request parameters
   * @returns Response data and transaction details
   */
  async callEndpoint(endpoint: Endpoint, params: unknown): Promise<EndpointCallResult> {
    logger.info(`Calling endpoint: ${endpoint.id}`, {
      url: endpoint.url,
      method: endpoint.method,
    });

    try {
      // Make the request with retry logic
      const result = await retryWithBackoff(
        async () => this.makeRequest(endpoint, params),
        {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 5000,
        }
      );

      // Log successful transaction
      logger.logTransaction({
        endpoint: endpoint.id,
        txHash: result.txHash,
        status: 'success',
      });

      return result;
    } catch (error) {
      // Log failed transaction
      logger.logTransaction({
        endpoint: endpoint.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Make the actual HTTP request to the endpoint
   */
  private async makeRequest(endpoint: Endpoint, params: unknown): Promise<EndpointCallResult> {
    try {
      // Prepare request options
      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Add body for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        requestOptions.body = JSON.stringify(params);
      }

      // Make request with x402 payment support
      const response = await this.wrappedFetch(endpoint.url, requestOptions);

      // Extract payment response header (transaction hash)
      const paymentHeader = response.headers.get('X-PAYMENT-RESPONSE');
      const txHash = paymentHeader ? this.extractTxHash(paymentHeader) : undefined;

      // Check response status
      if (!response.ok) {
        const errorText = await response.text();
        throw new NetworkError(
          `HTTP ${response.status}: ${errorText || response.statusText}`,
          response.status,
          endpoint.url
        );
      }

      // Parse response JSON
      const data = await response.json();

      logger.debug('Request successful', {
        endpoint: endpoint.id,
        txHash,
        paymentMade: !!txHash,
      });

      return {
        data,
        txHash,
        paymentMade: !!txHash,
      };
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }

      if (error instanceof Error) {
        // Check if this is a payment-related error
        if (error.message.includes('payment') || error.message.includes('402')) {
          throw new PaymentError(
            `Payment failed for endpoint ${endpoint.id}: ${error.message}`
          );
        }

        // Generic network error
        throw new NetworkError(
          `Request failed for endpoint ${endpoint.id}: ${error.message}`,
          undefined,
          endpoint.url
        );
      }

      throw error;
    }
  }

  /**
   * Extract transaction hash from X-PAYMENT-RESPONSE header
   * The header format may vary, so we try to parse it safely
   */
  private extractTxHash(paymentHeader: string): string | undefined {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(paymentHeader);
      if (parsed.txHash) {
        return parsed.txHash;
      }
      if (parsed.transactionHash) {
        return parsed.transactionHash;
      }
    } catch {
      // If not JSON, treat as raw tx hash
      if (paymentHeader.startsWith('0x')) {
        return paymentHeader;
      }
    }

    return undefined;
  }
}
