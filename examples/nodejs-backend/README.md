# Node.js Backend Integration Example

This example shows how to integrate the x402 Agent MCP Server into a Node.js backend application.

## Use Case

You're building a web application with a Node.js backend that needs to make x402-protected API calls. Instead of implementing x402 payment logic yourself, you use this MCP server to handle all payments automatically.

## Prerequisites

- Node.js >= 18.0.0
- A CDP wallet with USDC balance

## Setup

### 1. Install dependencies

```bash
npm install @modelcontextprotocol/sdk @x402-agent/mcp-server
```

### 2. Configure environment

Create a `.env` file:

```bash
PRIVATE_KEY=0x...
X402_CONFIG_PATH=./endpoints.json
```

### 3. Copy configuration

Copy the `endpoints.json` from this directory to your project root:

```bash
cp endpoints.json ./
```

## Usage

### Starting the MCP Server

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Start MCP server as a child process
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['@x402-agent/mcp-server'],
  env: {
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    X402_CONFIG_PATH: './endpoints.json'
  }
});

const client = new Client(
  { name: 'my-app', version: '1.0.0' },
  { capabilities: {} }
);

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);
```

### Making x402 API Calls

```typescript
// Call an x402-protected endpoint
const result = await client.callTool({
  name: 'minifetch_extract_metadata',
  arguments: {
    url: 'https://example.com',
    includeResponseBody: 'false'
  }
});

// Access the data
console.log('Metadata:', result.content);

// Access payment details (if available in response)
console.log('Transaction:', result.txHash);
console.log('BaseScan:', `https://basescan.org/tx/${result.txHash}`);
```

### Complete Example

See `server.js` for a complete Express.js server example that:
1. Starts the x402 MCP server
2. Exposes endpoints for your frontend
3. Handles x402 payments automatically
4. Returns results + transaction confirmations

## Running the Example

```bash
# Install dependencies
npm install

# Set environment variables
export PRIVATE_KEY="0x..."

# Run the server
node server.js
```

The server will start on `http://localhost:3000` and expose:
- `POST /api/extract-metadata` - Extract URL metadata using x402

## Production Deployment

### Environment Variables

Set these in your deployment platform:

```bash
PRIVATE_KEY=0x...           # Required: Your CDP wallet private key
X402_CONFIG_PATH=./endpoints.json  # Optional: Path to config
NODE_ENV=production               # Optional: Production mode
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV X402_CONFIG_PATH=./endpoints.json

CMD ["node", "server.js"]
```

### Health Checks

Monitor the MCP server connection:

```typescript
// Periodically check connection
setInterval(async () => {
  try {
    const tools = await client.listTools();
    console.log('MCP server healthy:', tools.length, 'tools available');
  } catch (error) {
    console.error('MCP server connection lost:', error);
    // Implement reconnection logic
  }
}, 60000); // Check every minute
```

## Security Best Practices

1. **Never commit private keys** - Use environment variables
2. **Separate wallets per environment** - dev, staging, prod
3. **Monitor wallet balance** - Set up alerts for low USDC
4. **Log all transactions** - For audit trails
5. **Validate endpoint responses** - Don't trust external data blindly

## Troubleshooting

### "MCP server not starting"
- Check that `@x402-agent/mcp-server` is installed
- Verify PRIVATE_KEY is set
- Check endpoints.json syntax

### "Payment failures"
- Ensure wallet has USDC balance on Base network
- Verify private key is correct
- Check network configuration matches endpoints

### "Connection lost"
- Implement reconnection logic
- Check for process crashes in logs
- Monitor system resources
