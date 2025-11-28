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
      params: params,
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
      // Build URL with query parameters for GET/DELETE requests
      let url = endpoint.url;
      if (['GET', 'DELETE'].includes(endpoint.method) && params && typeof params === 'object') {
        const queryParams = new URLSearchParams();
        Object.entries(params as Record<string, any>).forEach(([key, value]) => {
          queryParams.append(key, String(value));
        });
        url = `${endpoint.url}?${queryParams.toString()}`;
      }

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
        logger.debug('Request body for POST/PUT/PATCH', {
          endpoint: endpoint.id,
          params: params,
          body: requestOptions.body,
        });
      }

      // Make request with x402 payment support
      const response = await this.wrappedFetch(url, requestOptions);

      // Extract payment info from headers
      const paymentInfo = this.extractPaymentInfo(response);
      const txHash = paymentInfo.txHash;
      const amount = paymentInfo.amount;

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

      // Log with payment details
      if (txHash) {
        logger.info('Payment successful', {
          endpoint: endpoint.id,
          txHash,
          amount: amount || 'unknown',
          baseScanUrl: `https://basescan.org/tx/${txHash}`,
        });
      } else {
        logger.debug('Request successful (no payment detected)', {
          endpoint: endpoint.id,
        });
      }

      return {
        data,
        txHash,
        amount,
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
   * Extract transaction hash and amount from response
   * Supports multiple formats from different x402 endpoints
   */
  private extractPaymentInfo(response: Response): { txHash?: string; amount?: string } {
    // Format 1: X-PAYMENT-RESPONSE header (used by some x402 services)
    // Can be base64-encoded JSON or plain JSON
    const paymentResponseHeader = response.headers.get('X-PAYMENT-RESPONSE');
    if (paymentResponseHeader) {
      try {
        // Try base64 decoding first (minifetch/x402 standard format)
        const decoded = Buffer.from(paymentResponseHeader, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        return {
          txHash: parsed.transaction || parsed.txHash || parsed.transactionHash || parsed.tx_hash,
          amount: parsed.amount || parsed.value,
        };
      } catch {
        // Fallback: try direct JSON parsing (not base64)
        try {
          const parsed = JSON.parse(paymentResponseHeader);
          return {
            txHash: parsed.transaction || parsed.txHash || parsed.transactionHash || parsed.tx_hash,
            amount: parsed.amount || parsed.value,
          };
        } catch {
          // Try parsing as "tx_hash:0x..." format
          const match = paymentResponseHeader.match(/tx_hash:([0-9a-fA-Fx]+)/);
          if (match) {
            return { txHash: match[1] };
          }
          // If not JSON and not "tx_hash:" format, treat as raw tx hash
          if (paymentResponseHeader.startsWith('0x')) {
            return { txHash: paymentResponseHeader };
          }
        }
      }
    }

    // Format 2: X-Transaction-Hash header (alternative format)
    const txHeader = response.headers.get('X-Transaction-Hash');
    if (txHeader) {
      return { txHash: txHeader };
    }

    // Format 3: Log all response headers for debugging
    const allHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      allHeaders[key.toLowerCase()] = value;
    });

    logger.debug('Response headers (no payment info found)', { headers: allHeaders });

    return {};
  }
}
