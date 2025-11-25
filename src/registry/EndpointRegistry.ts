import { readFileSync } from 'fs';
import { Config, Endpoint } from './types.js';

/**
 * EndpointRegistry manages loading, validating, and accessing endpoint configurations
 */
export class EndpointRegistry {
  private config: Config | null = null;
  private endpointMap: Map<string, Endpoint> = new Map();

  /**
   * Load configuration from a JSON file
   * @param configPath Path to the endpoints.json file
   * @returns Parsed configuration object
   */
  loadConfig(configPath: string): Config {
    try {
      // Read file synchronously (only done once at startup)
      const fileContent = readFileSync(configPath, 'utf-8');

      // Parse JSON
      const rawConfig = JSON.parse(fileContent);

      // Interpolate environment variables in the config
      const config = this.interpolateEnvVars(rawConfig);

      // Store config
      this.config = config;

      // Build endpoint lookup map
      this.buildEndpointMap(config.endpoints);

      return config;
    } catch (error) {
      if (error instanceof Error) {
        if ((error as any).code === 'ENOENT') {
          throw new Error(
            `Configuration file not found at: ${configPath}\n` +
            `Please create a configuration file. See example at: config/endpoints.example.json`
          );
        }
        if (error instanceof SyntaxError) {
          throw new Error(
            `Invalid JSON in configuration file: ${configPath}\n` +
            `Error: ${error.message}`
          );
        }
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Interpolate environment variables in config
   * Replaces ${VAR_NAME} with process.env.VAR_NAME
   */
  private interpolateEnvVars(obj: any): any {
    if (typeof obj === 'string') {
      // Match ${VAR_NAME} pattern
      const envVarPattern = /\$\{([^}]+)\}/g;
      return obj.replace(envVarPattern, (match, varName) => {
        const value = process.env[varName];
        if (value === undefined) {
          throw new Error(
            `Environment variable ${varName} is not set. ` +
            `Please set it before starting the server.`
          );
        }
        return value;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateEnvVars(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateEnvVars(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * Build a map for O(1) endpoint lookup by ID
   */
  private buildEndpointMap(endpoints: Endpoint[]): void {
    this.endpointMap.clear();
    for (const endpoint of endpoints) {
      this.endpointMap.set(endpoint.id, endpoint);
    }
  }

  /**
   * Get an endpoint by its ID
   * @param id Endpoint identifier
   * @returns Endpoint object or undefined if not found
   */
  getEndpoint(id: string): Endpoint | undefined {
    return this.endpointMap.get(id);
  }

  /**
   * Get all endpoints
   * @returns Array of all configured endpoints
   */
  getAllEndpoints(): Endpoint[] {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config.endpoints;
  }

  /**
   * Get only trusted endpoints
   * @returns Array of endpoints with trusted=true
   */
  getTrustedEndpoints(): Endpoint[] {
    return this.getAllEndpoints().filter(endpoint => endpoint.trusted);
  }

  /**
   * Get the wallet configuration
   * @returns Wallet configuration object
   */
  getWalletConfig() {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config.wallet;
  }

  /**
   * Get the full configuration
   * @returns Complete configuration object
   */
  getConfig(): Config {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Check if an endpoint exists and is trusted
   * @param id Endpoint identifier
   * @returns true if endpoint exists and is trusted
   */
  isTrustedEndpoint(id: string): boolean {
    const endpoint = this.getEndpoint(id);
    return endpoint !== undefined && endpoint.trusted === true;
  }
}
