/**
 * Simple logging utility for the x402 Agent MCP Server
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export class Logger {
  private debugEnabled: boolean;

  constructor() {
    // Enable debug mode via DEBUG environment variable
    this.debugEnabled = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
  }

  /**
   * Log a debug message (only shown if DEBUG=true)
   */
  debug(message: string, meta?: Record<string, any>): void {
    if (this.debugEnabled) {
      this.log('DEBUG', message, meta);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log('INFO', message, meta);
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log('WARN', message, meta);
  }

  /**
   * Log an error message
   */
  error(message: string, meta?: Record<string, any>): void {
    this.log('ERROR', message, meta);
  }

  /**
   * Log a transaction for audit trail
   */
  logTransaction(data: {
    endpoint: string;
    txHash?: string;
    amount?: string;
    status: 'success' | 'failed';
    error?: string;
  }): void {
    const message = `Transaction ${data.status}: ${data.endpoint}`;
    const level = data.status === 'success' ? 'INFO' : 'ERROR';

    this.log(level, message, {
      endpoint: data.endpoint,
      txHash: data.txHash,
      amount: data.amount,
      error: data.error,
    });
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level}:`;

    if (meta && Object.keys(meta).length > 0) {
      console.error(`${prefix} ${message}`, meta);
    } else {
      console.error(`${prefix} ${message}`);
    }
  }
}

// Export singleton instance
export const logger = new Logger();
