#!/usr/bin/env node

import { config } from 'dotenv';
import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createMCPServer, createStdioTransport } from './server.js';
import { EndpointRegistry } from './registry/EndpointRegistry.js';
import { validateConfig } from './registry/validator.js';
import { WalletManager } from './payment/WalletManager.js';
import { PaymentHandler } from './payment/PaymentHandler.js';
import { handleListTools } from './handlers/listTools.js';
import { handleCallTool } from './handlers/callTool.js';
import { logger } from './utils/logger.js';
import { ConfigError } from './utils/errors.js';
import { jsonSchemaToZod } from './utils/schemaConverter.js';

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

/**
 * Main entry point for the x402 Claude MCP Server
 */
async function main() {
  try {
    // Load environment variables
    // Silence dotenv output to prevent JSON-RPC protocol corruption
    const originalLog = console.log;
    console.log = () => {};
    config();
    console.log = originalLog;

    logger.info('Starting x402 Claude MCP Server...');

    // Support multiple config locations in priority order:
    // 1. Explicit env var (X402_CONFIG_PATH)
    // 2. Project root (./x402-endpoints.json)
    // 3. Config folder (./config/endpoints.json)
    // 4. User home (~/.x402-claude-mcp/endpoints.json) - fallback
    const configPaths = [
      process.env.X402_CONFIG_PATH,
      join(process.cwd(), 'x402-endpoints.json'),
      join(process.cwd(), 'config', 'endpoints.json'),
      join(homedir(), '.x402-claude-mcp', 'endpoints.json'),
    ].filter(Boolean) as string[];

    // Find the first config file that exists
    let configPath: string | undefined;
    for (const path of configPaths) {
      if (existsSync(path)) {
        configPath = path;
        break;
      }
    }

    if (!configPath) {
      throw new ConfigError(
        'No configuration file found. Tried the following locations:\n' +
        configPaths.map((p, i) => `${i + 1}. ${p}`).join('\n') +
        '\n\nPlease create a configuration file. See example at: config/endpoints.example.json'
      );
    }

    logger.debug('Loading configuration', { path: configPath });

    // Initialize endpoint registry
    const registry = new EndpointRegistry();
    const loadedConfig = registry.loadConfig(configPath);

    // Validate configuration
    logger.debug('Validating configuration...');
    validateConfig(loadedConfig);

    logger.info('Configuration loaded and validated successfully', {
      endpoints: loadedConfig.endpoints.length,
      network: loadedConfig.wallet.network,
    });

    // Initialize wallet
    logger.debug('Initializing wallet...');
    const walletManager = new WalletManager();
    const walletClient = await walletManager.initialize(loadedConfig.wallet);

    // Initialize payment handler with network and private key
    const paymentHandler = await PaymentHandler.create(
      walletClient,
      loadedConfig.wallet.network,
      loadedConfig.wallet.privateKey
    );

    // Create MCP server
    const server = createMCPServer();

    // Register each endpoint as a tool using the handler
    const endpoints = registry.getAllEndpoints();
    for (const endpoint of endpoints) {
      logger.debug(`Registering tool: ${endpoint.id}`);

      try {
        // Convert JSON Schema to Zod shape (plain object with Zod properties)
        const zodSchema = jsonSchemaToZod(endpoint.parameters);

        server.registerTool(
          endpoint.id,
          {
            description: endpoint.description,
            inputSchema: zodSchema,
          },
          async (args: any) => {
            // Use the callTool handler
            const request = {
              params: {
                name: endpoint.id,
                arguments: args,
              },
            };
            return await handleCallTool(request, registry, paymentHandler);
          }
        );

        const paramCount = zodSchema ? Object.keys(zodSchema).length : 0;
        logger.debug(`Tool registered successfully: ${endpoint.id}`, {
          hasSchema: !!zodSchema,
          parameterCount: paramCount,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to register tool: ${endpoint.id}`, {
          error: errorMessage,
        });
        throw new ConfigError(
          `Failed to register tool "${endpoint.id}": ${errorMessage}`
        );
      }
    }

    const transport = createStdioTransport();

    // Set up graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down x402 Claude MCP Server...');
      try {
        await server.close();
        logger.info('Server closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start the server
    logger.info('Connecting to stdio transport...');
    await server.connect(transport);

    logger.info('x402 Claude MCP Server is ready', {
      version: packageJson.version,
      endpoints: registry.getAllEndpoints().map(e => e.id),
    });

    // Keep the process running
    await new Promise(() => {});
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error('Configuration error:', { error: error.message });
      console.error('\nConfiguration Error:\n' + error.message);
      console.error('\nPlease check your configuration file and try again.');
      process.exit(1);
    }

    logger.error('Fatal error during startup', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('\nFatal Error:\n', error);
    process.exit(1);
  }
}

// Run the server
main();
