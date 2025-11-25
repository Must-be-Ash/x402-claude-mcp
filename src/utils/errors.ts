/**
 * Custom error classes for the x402 Agent MCP Server
 */

/**
 * Base error class for all x402 agent errors
 */
export class X402AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Configuration-related errors (invalid config, missing files, etc.)
 */
export class ConfigError extends X402AgentError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Payment-related errors (transaction failures, insufficient funds, etc.)
 */
export class PaymentError extends X402AgentError {
  public readonly txHash?: string;
  public readonly amount?: string;

  constructor(message: string, txHash?: string, amount?: string) {
    super(message);
    this.txHash = txHash;
    this.amount = amount;
  }
}

/**
 * Network-related errors (API unreachable, timeouts, etc.)
 */
export class NetworkError extends X402AgentError {
  public readonly statusCode?: number;
  public readonly url?: string;

  constructor(message: string, statusCode?: number, url?: string) {
    super(message);
    this.statusCode = statusCode;
    this.url = url;
  }
}

/**
 * Validation errors (invalid parameters, schema mismatches, etc.)
 */
export class ValidationError extends X402AgentError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

/**
 * Endpoint trust errors (attempting to call untrusted endpoint)
 */
export class TrustError extends X402AgentError {
  public readonly endpointId: string;

  constructor(endpointId: string) {
    super(
      `Endpoint "${endpointId}" is not trusted for autonomous execution. ` +
      `Set "trusted": true in the endpoint configuration to allow autonomous calls.`
    );
    this.endpointId = endpointId;
  }
}

/**
 * Schema conversion errors (JSON Schema to Zod conversion failures)
 */
export class SchemaConversionError extends X402AgentError {
  public readonly schemaType?: string;
  public readonly propertyPath?: string;

  constructor(
    message: string,
    schemaType?: string,
    propertyPath?: string
  ) {
    super(message);
    this.schemaType = schemaType;
    this.propertyPath = propertyPath;
  }
}
