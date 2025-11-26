import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

let mcpClient = null;

/**
 * Initialize MCP client connection
 */
async function initializeMCP() {
  try {
    console.log('Starting x402 Claude MCP Server...');

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['x402-claude-mcp'],
      env: {
        PRIVATE_KEY: process.env.PRIVATE_KEY,
        X402_CONFIG_PATH: process.env.X402_CONFIG_PATH || './endpoints.json'
      }
    });

    mcpClient = new Client(
      { name: 'nodejs-backend-example', version: '1.0.0' },
      { capabilities: {} }
    );

    await mcpClient.connect(transport);

    const tools = await mcpClient.listTools();
    console.log(`MCP server connected. Available tools: ${tools.tools.length}`);
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize MCP:', error);
    return false;
  }
}

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    if (!mcpClient) {
      return res.status(503).json({ status: 'error', message: 'MCP client not initialized' });
    }

    const tools = await mcpClient.listTools();
    res.json({
      status: 'healthy',
      mcp: {
        connected: true,
        tools: tools.tools.length
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Extract metadata from a URL using x402 payment
 */
app.post('/api/extract-metadata', async (req, res) => {
  try {
    const { url, includeResponseBody } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!mcpClient) {
      return res.status(503).json({ error: 'MCP client not initialized' });
    }

    console.log(`Extracting metadata from: ${url}`);

    // Call the x402-protected endpoint via MCP
    const result = await mcpClient.callTool({
      name: 'minifetch_extract_metadata',
      arguments: {
        url,
        includeResponseBody: includeResponseBody || 'false'
      }
    });

    // Extract data from MCP response
    const responseData = result.content[0]?.text
      ? JSON.parse(result.content[0].text)
      : result.content;

    // Return response with payment details
    res.json({
      success: true,
      data: responseData,
      payment: {
        txHash: responseData.txHash,
        baseScanUrl: responseData.txHash
          ? `https://basescan.org/tx/${responseData.txHash}`
          : null,
        paymentMade: responseData.paymentMade || false
      }
    });

  } catch (error) {
    console.error('Error extracting metadata:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate QR code for a URL using x402 payment
 */
app.post('/api/generate-qr', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!mcpClient) {
      return res.status(503).json({ error: 'MCP client not initialized' });
    }

    console.log(`Generating QR code for: ${url}`);

    // Call the x402-protected endpoint via MCP
    const result = await mcpClient.callTool({
      name: 'qr_code_generator',
      arguments: { url }
    });

    // Extract data from MCP response
    const responseData = result.content[0]?.text
      ? JSON.parse(result.content[0].text)
      : result.content;

    // Return response with payment details
    res.json({
      success: true,
      data: responseData,
      payment: {
        txHash: responseData.txHash,
        baseScanUrl: responseData.txHash
          ? `https://basescan.org/tx/${responseData.txHash}`
          : null,
        paymentMade: responseData.paymentMade || false
      }
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List all available x402 tools
 */
app.get('/api/tools', async (req, res) => {
  try {
    if (!mcpClient) {
      return res.status(503).json({ error: 'MCP client not initialized' });
    }

    const tools = await mcpClient.listTools();

    res.json({
      success: true,
      tools: tools.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    });

  } catch (error) {
    console.error('Error listing tools:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Start the server
 */
async function start() {
  // Initialize MCP connection first
  const mcpInitialized = await initializeMCP();

  if (!mcpInitialized) {
    console.error('Failed to initialize MCP server. Exiting.');
    process.exit(1);
  }

  // Start Express server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Extract metadata: POST http://localhost:${PORT}/api/extract-metadata`);
    console.log(`Generate QR code: POST http://localhost:${PORT}/api/generate-qr`);
    console.log(`List tools: GET http://localhost:${PORT}/api/tools`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

// Start the application
start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
