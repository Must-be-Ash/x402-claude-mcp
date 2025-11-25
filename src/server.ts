import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

/**
 * Create and configure the MCP server
 */
export function createMCPServer(): McpServer {
  const server = new McpServer({
    name: 'x402-agent',
    version: packageJson.version,
  });

  return server;
}

/**
 * Create stdio transport for the MCP server
 */
export function createStdioTransport(): StdioServerTransport {
  return new StdioServerTransport();
}
