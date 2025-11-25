/**
 * TypeScript type definitions for the x402 Agent MCP Server
 * These types define the structure of the JSON configuration file
 */

/**
 * Wallet configuration for CDP embedded wallet
 */
export interface WalletConfig {
  /** Wallet provider type (currently only 'cdp-embedded' supported) */
  provider: 'cdp-embedded';

  /** Network to use for transactions */
  network: 'base' | 'base-sepolia' | 'ethereum' | 'sepolia';

  /** Private key for the wallet (can be literal or environment variable like ${CDP_PRIVATE_KEY}) */
  privateKey: string;
}

/**
 * JSON Schema definition for endpoint parameters
 */
export interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  properties?: Record<string, JSONSchema>;
  required?: string[];
  description?: string;
  enum?: string[];
  items?: JSONSchema;
}

/**
 * x402 endpoint definition
 */
export interface Endpoint {
  /** Unique identifier for this endpoint (snake_case) */
  id: string;

  /** Human-readable name */
  name: string;

  /** Full URL of the x402-protected endpoint */
  url: string;

  /** HTTP method to use */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /** Detailed description of what this endpoint does (minimum 20 characters) */
  description: string;

  /** Category for grouping endpoints (e.g., 'search', 'media', 'data') */
  category?: string;

  /** JSON Schema defining the parameters this endpoint accepts */
  parameters: JSONSchema;

  /** Estimated cost per request (for user reference) */
  estimatedCost?: string;

  /** Whether this endpoint is trusted for autonomous agent execution */
  trusted: boolean;
}

/**
 * Complete configuration structure
 */
export interface Config {
  /** Wallet configuration */
  wallet: WalletConfig;

  /** Array of available x402 endpoints */
  endpoints: Endpoint[];
}

/**
 * Result of calling an x402 endpoint
 */
export interface EndpointCallResult {
  /** Response data from the endpoint */
  data: any;

  /** Transaction hash from the payment (if payment was made) */
  txHash?: string;

  /** Payment amount in USDC (if payment was made) */
  amount?: string;

  /** Whether a payment was required and executed */
  paymentMade?: boolean;
}

/**
 * MCP tool schema (matches MCP protocol specification)
 */
export interface MCPTool {
  /** Tool name (matches endpoint.id) */
  name: string;

  /** Tool description (matches endpoint.description) */
  description: string;

  /** Input schema (matches endpoint.parameters) */
  inputSchema: JSONSchema;
}
