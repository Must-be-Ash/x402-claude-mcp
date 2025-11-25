import { Config, Endpoint, WalletConfig, JSONSchema } from './types.js';

/**
 * Validates the complete configuration object
 * Throws descriptive errors if validation fails
 */
export function validateConfig(config: Config): void {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be a valid object');
  }

  // Validate wallet configuration
  if (!config.wallet) {
    throw new Error('Configuration missing required field: wallet');
  }
  validateWalletConfig(config.wallet);

  // Validate endpoints array
  if (!config.endpoints) {
    throw new Error('Configuration missing required field: endpoints');
  }
  if (!Array.isArray(config.endpoints)) {
    throw new Error('Field "endpoints" must be an array');
  }
  if (config.endpoints.length === 0) {
    throw new Error('Configuration must include at least one endpoint');
  }

  // Validate each endpoint
  const endpointIds = new Set<string>();
  for (let i = 0; i < config.endpoints.length; i++) {
    try {
      validateEndpoint(config.endpoints[i]);

      // Check for duplicate IDs
      if (endpointIds.has(config.endpoints[i].id)) {
        throw new Error(`Duplicate endpoint ID: "${config.endpoints[i].id}"`);
      }
      endpointIds.add(config.endpoints[i].id);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Endpoint at index ${i}: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Validates wallet configuration
 */
function validateWalletConfig(wallet: WalletConfig): void {
  // Validate provider
  if (!wallet.provider) {
    throw new Error('Wallet configuration missing required field: provider');
  }
  if (wallet.provider !== 'cdp-embedded') {
    throw new Error(
      `Invalid wallet provider: "${wallet.provider}". ` +
      `Only "cdp-embedded" is currently supported.`
    );
  }

  // Validate network
  if (!wallet.network) {
    throw new Error('Wallet configuration missing required field: network');
  }
  const validNetworks = ['base', 'base-sepolia', 'ethereum', 'sepolia'];
  if (!validNetworks.includes(wallet.network)) {
    throw new Error(
      `Invalid wallet network: "${wallet.network}". ` +
      `Must be one of: ${validNetworks.join(', ')}`
    );
  }

  // Validate private key
  if (!wallet.privateKey) {
    throw new Error('Wallet configuration missing required field: privateKey');
  }
  if (typeof wallet.privateKey !== 'string') {
    throw new Error('Wallet privateKey must be a string');
  }

  // Check private key format (hex, base64, or env var)
  const isHexKey = /^0x[0-9a-fA-F]{64}$/.test(wallet.privateKey);
  const isBase64Key = /^[A-Za-z0-9+/]+=*$/.test(wallet.privateKey) && wallet.privateKey.length >= 32;
  const isEnvVar = /^\$\{[^}]+\}$/.test(wallet.privateKey);

  if (!isHexKey && !isBase64Key && !isEnvVar) {
    throw new Error(
      'Wallet privateKey must be either:\n' +
      '  - A valid hex string starting with 0x (0x...)\n' +
      '  - A base64-encoded key\n' +
      '  - An environment variable reference (${VAR_NAME})'
    );
  }
}

/**
 * Validates a single endpoint configuration
 */
function validateEndpoint(endpoint: Endpoint): void {
  // Validate id
  if (!endpoint.id) {
    throw new Error('Missing required field: id');
  }
  if (typeof endpoint.id !== 'string') {
    throw new Error('Field "id" must be a string');
  }
  // Check snake_case format
  if (!/^[a-z][a-z0-9_]*$/.test(endpoint.id)) {
    throw new Error(
      `Invalid endpoint ID format: "${endpoint.id}". ` +
      `Must be snake_case (lowercase letters, numbers, underscores only)`
    );
  }

  // Validate name
  if (!endpoint.name) {
    throw new Error('Missing required field: name');
  }
  if (typeof endpoint.name !== 'string') {
    throw new Error('Field "name" must be a string');
  }

  // Validate url
  if (!endpoint.url) {
    throw new Error('Missing required field: url');
  }
  if (typeof endpoint.url !== 'string') {
    throw new Error('Field "url" must be a string');
  }
  try {
    new URL(endpoint.url);
  } catch {
    throw new Error(`Invalid URL format: "${endpoint.url}"`);
  }
  if (!endpoint.url.startsWith('https://')) {
    throw new Error(
      `Endpoint URL must use HTTPS: "${endpoint.url}"`
    );
  }

  // Validate method
  if (!endpoint.method) {
    throw new Error('Missing required field: method');
  }
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (!validMethods.includes(endpoint.method)) {
    throw new Error(
      `Invalid HTTP method: "${endpoint.method}". ` +
      `Must be one of: ${validMethods.join(', ')}`
    );
  }

  // Validate description
  if (!endpoint.description) {
    throw new Error('Missing required field: description');
  }
  if (typeof endpoint.description !== 'string') {
    throw new Error('Field "description" must be a string');
  }
  if (endpoint.description.length < 20) {
    throw new Error(
      `Description too short (${endpoint.description.length} characters). ` +
      `Minimum 20 characters required for clear tool descriptions.`
    );
  }

  // Validate parameters (JSON Schema)
  if (!endpoint.parameters) {
    throw new Error('Missing required field: parameters');
  }
  validateJSONSchema(endpoint.parameters);

  // Validate trusted
  if (endpoint.trusted === undefined || endpoint.trusted === null) {
    throw new Error('Missing required field: trusted');
  }
  if (typeof endpoint.trusted !== 'boolean') {
    throw new Error('Field "trusted" must be a boolean (true or false)');
  }

  // Validate optional fields
  if (endpoint.category !== undefined && typeof endpoint.category !== 'string') {
    throw new Error('Field "category" must be a string');
  }
  if (endpoint.estimatedCost !== undefined && typeof endpoint.estimatedCost !== 'string') {
    throw new Error('Field "estimatedCost" must be a string');
  }
}

/**
 * Validates a JSON Schema object (basic validation)
 */
function validateJSONSchema(schema: JSONSchema): void {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Parameters must be a valid JSON Schema object');
  }

  if (!schema.type) {
    throw new Error('JSON Schema missing required field: type');
  }

  const validTypes = ['object', 'string', 'number', 'boolean', 'array'];
  if (!validTypes.includes(schema.type)) {
    throw new Error(
      `Invalid JSON Schema type: "${schema.type}". ` +
      `Must be one of: ${validTypes.join(', ')}`
    );
  }

  // For object types, validate properties
  if (schema.type === 'object') {
    if (schema.properties && typeof schema.properties !== 'object') {
      throw new Error('JSON Schema "properties" must be an object');
    }
    if (schema.required && !Array.isArray(schema.required)) {
      throw new Error('JSON Schema "required" must be an array');
    }
  }

  // For array types, validate items
  if (schema.type === 'array') {
    if (schema.items && typeof schema.items !== 'object') {
      throw new Error('JSON Schema "items" must be an object');
    }
  }
}
