# x402 Claude MCP Server

A reusable **MCP (Model Context Protocol) server** that enables LLM agents to autonomously call x402-protected APIs using CDP embedded wallets. This server exposes configured x402 endpoints as MCP tools, allowing agents to discover and use paid APIs without manual payment handling.

## Features

- **Autonomous Payments**: Automatic x402 payment handling using CDP embedded wallets
- **Dynamic Discovery**: Agents discover available endpoints through MCP tool definitions
- **Flexible Configuration**: JSON-based endpoint configuration with environment variable support
- **Security First**: Trust model ensures only approved endpoints can be called
- **Multi-Network Support**: Works with Base, Base Sepolia, Ethereum, and Sepolia testnets
- **Universal Compatibility**: Works with Claude Desktop, Claude Code, Codex, Gemini, and other MCP clients

## Prerequisites

- Node.js >= 18.0.0
- A CDP embedded wallet with USDC balance
- An MCP-compatible client (Claude Desktop, Claude Code, etc.)

## Quick Start (Recommended)

The easiest way to get started is with the interactive setup wizard:

```bash
npx x402-claude-mcp setup
```

**Alternative ways to run setup:**
```bash
# If installed globally
npm install -g x402-claude-mcp
x402-claude-mcp setup

# Or with short flag
npx x402-claude-mcp --setup
npx x402-claude-mcp -s

# Or from local installation
npm run setup
```

**What the setup wizard does:**
- ✅ Creates `~/.x402-claude-mcp/` directory
- ✅ Generates `endpoints.json` with pre-configured x402 APIs (QR codes, metadata extraction, GIF search, etc.)
- ✅ Prompts for your CDP wallet private key
- ✅ Updates `~/Library/Application Support/Claude/claude_desktop_config.json` automatically
- ✅ Configures the MCP server with proper environment variables

**That's it!** After restarting Claude Desktop, you'll have a wallet and can start using x402-protected APIs.

Look for the 🔌 icon in Claude Desktop to verify the server is running.

## Installation

### Global Installation

```bash
npm install -g x402-claude-mcp
```

### Or Use with npx

```bash
npx x402-claude-mcp
```

## Manual Configuration

> **Note:** We recommend using `npx x402-claude-mcp setup` instead of manual configuration. Use this section only if you prefer manual setup or need custom configuration.

### 1. Create Configuration Directory

```bash
mkdir -p ~/.x402-claude-mcp
```

### 2. Create Endpoint Configuration

Create `~/.x402-claude-mcp/endpoints.json`:

```json
{
  "wallet": {
    "provider": "cdp-embedded",
    "network": "base",
    "privateKey": "${PRIVATE_KEY}"
  },
  "endpoints": [
    {
      "id": "minifetch_extract_metadata",
      "name": "Extract URL Metadata",
      "url": "https://minifetch.com/api/v1/x402/extract/url-metadata",
      "method": "GET",
      "description": "Fetch and extract HTML metadata from a specified URL. Returns all HTML meta tags, Open Graph tags, Twitter tags, headings, image tags, and response headers. Set includeResponseBody=true to return entire response body as a string. Useful for SEO and AI research projects.",
      "category": "web-scraping",
      "parameters": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "description": "The URL from which to extract HTML metadata"
          },
          "includeResponseBody": {
            "type": "string",
            "description": "If set to 'true', includes the full HTML response body as a string in the result"
          }
        },
        "required": ["url"]
      },
      "estimatedCost": "$0.01",
      "trusted": true
    }
  ]
}
```

See `config/endpoints.example.json` for a complete example with multiple endpoints.

### 3. Set Environment Variables

Create a `.env` file or set environment variables:

```bash
export PRIVATE_KEY="0x..."
export X402_CONFIG_PATH="~/.x402-claude-mcp/endpoints.json"  # Optional, defaults to this
export DEBUG="false"  # Set to "true" for debug logging
```

### 4. Configure Your MCP Client

#### Claude Desktop (macOS)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402-claude-mcp": {
      "command": "npx",
      "args": ["-y", "x402-claude-mcp"],
      "env": {
        "PRIVATE_KEY": "0x...",
        "X402_CONFIG_PATH": "~/.x402-claude-mcp/endpoints.json"
      }
    }
  }
}
```

#### Claude Code

Edit `~/.claude/settings.json`:

```json
{
  "mcp": {
    "x402-claude-mcp": {
      "command": "npx x402-claude-mcp",
      "env": {
        "PRIVATE_KEY": "0x...",
        "X402_CONFIG_PATH": "~/.x402-claude-mcp/endpoints.json"
      }
    }
  }
}
```

#### Codex CLI

Edit `~/.codex/config.toml`:

```toml
[[mcpServers]]
name = "x402-claude-mcp"
command = "npx"
args = ["x402-claude-mcp"]

[mcpServers.env]
PRIVATE_KEY = "0x..."
X402_CONFIG_PATH = "~/.x402-claude-mcp/endpoints.json"
```

## Usage

Once configured, your LLM agent can autonomously use the endpoints:

```
User: "Extract metadata from https://example.com and tell me about the page"

Agent: [Calls minifetch_extract_metadata tool]
       [Payment automatically handled via x402]
       [Receives metadata and summarizes]
```

The agent will:
1. Discover available tools via `tools/list`
2. Call endpoints via `tools/call`
3. Handle 402 payment responses automatically
4. Return results to the user

## Production Deployment

### For Node.js Applications

Install the MCP SDK and integrate the x402 agent into your backend:

```bash
npm install @modelcontextprotocol/sdk
```

```typescript
import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Start MCP server as a child process
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['x402-claude-mcp'],
  env: {
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    X402_CONFIG_PATH: './x402-endpoints.json'
  }
});

const client = new Client({ name: 'my-app', version: '1.0.0' }, {});
await client.connect(transport);

// Call x402-protected endpoints
const result = await client.callTool({
  name: 'minifetch_extract_metadata',
  arguments: { url: 'https://example.com' }
});

console.log('Result:', result.content);
console.log('Transaction:', result.txHash);
console.log('BaseScan:', `https://basescan.org/tx/${result.txHash}`);
```

### Configuration Paths

The server looks for `endpoints.json` in the following order:

1. `X402_CONFIG_PATH` environment variable (explicit path)
2. `./x402-endpoints.json` (project root)
3. `./config/endpoints.json` (config folder)
4. `~/.x402-claude-mcp/endpoints.json` (user home, fallback)

### Production Best Practices

When deploying to production:

1. **Add x402-endpoints.json to your repo** (without secrets - use `${PRIVATE_KEY}` template)
2. **Set PRIVATE_KEY as environment variable** in your deployment platform
3. **Run the MCP server as a child process** from your backend
4. **Monitor wallet balance** and set up alerts for low USDC
5. **Use separate wallets** for dev/staging/prod environments

## Configuration Reference

### Wallet Configuration

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `provider` | string | Wallet provider (only "cdp-embedded" supported) | Yes |
| `network` | string | Network: "base", "base-sepolia", "ethereum", "sepolia" | Yes |
| `privateKey` | string | Private key (hex or ${ENV_VAR}) | Yes |

### Endpoint Configuration

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `id` | string | Unique identifier (snake_case) | Yes |
| `name` | string | Human-readable name | Yes |
| `url` | string | HTTPS URL of x402 endpoint | Yes |
| `method` | string | HTTP method (GET, POST, PUT, PATCH, DELETE) | Yes |
| `description` | string | Tool description (min 20 chars) | Yes |
| `parameters` | object | JSON Schema for parameters | Yes |
| `trusted` | boolean | Allow autonomous execution | Yes |
| `category` | string | Endpoint category | No |
| `estimatedCost` | string | Estimated cost per call | No |

### Environment Variables

- `PRIVATE_KEY`: Your CDP wallet private key (required)
- `X402_CONFIG_PATH`: Path to endpoints.json (default: `~/.x402-claude-mcp/endpoints.json`)
- `DEBUG`: Enable debug logging (default: `false`)

## Development

### Build from Source

```bash
# Clone the repository
git clone https://github.com/Must-be-Ash/x402-claude-mcp.git
cd x402-claude-mcp

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

### Project Structure

```
x402-claude-mcp/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server setup
│   ├── handlers/
│   │   ├── listTools.ts      # tools/list handler
│   │   └── callTool.ts       # tools/call handler
│   ├── registry/
│   │   ├── types.ts          # TypeScript types
│   │   ├── EndpointRegistry.ts
│   │   └── validator.ts      # Config validation
│   ├── payment/
│   │   ├── WalletManager.ts  # CDP wallet
│   │   └── PaymentHandler.ts # x402 integration
│   └── utils/
│       ├── errors.ts         # Error classes
│       ├── logger.ts         # Logging
│       └── retry.ts          # Retry logic
├── config/
│   └── endpoints.example.json
└── package.json
```

## Troubleshooting

### Server Not Starting

- Check that Node.js >= 18.0.0 is installed: `node --version`
- Verify PRIVATE_KEY is set correctly
- Check configuration file syntax: `cat ~/.x402-claude-mcp/endpoints.json | jq`

### Endpoints Not Appearing

- Restart your MCP client after configuration changes
- Check server logs for errors (set `DEBUG=true`)
- Verify `trusted: true` is set in endpoint config

### Payment Failures

- Ensure wallet has sufficient USDC balance
- Check network matches endpoint requirements
- Verify private key has correct format (0x...)

### Configuration Errors

- Validate JSON syntax
- Ensure all required fields are present
- Check endpoint URLs use HTTPS
- Verify parameter schemas are valid JSON Schema

## Security

### Trust Model

Only endpoints with `"trusted": true` can be called autonomously. This prevents:
- Unauthorized spending on unknown endpoints
- Malicious endpoint injection
- Unintended payment execution

**Review endpoints carefully before setting `trusted: true`!**

### Private Key Safety

✅ **DO**:
- Use environment variables for private keys (`${PRIVATE_KEY}`)
- Use separate wallets for dev/staging/prod
- Monitor wallet balance and set up alerts
- Keep private keys in secure secret management systems
- Rotate keys periodically

❌ **DON'T**:
- Commit private keys to git
- Hardcode private keys in endpoints.json
- Share wallets between different applications
- Use production wallets for testing

### Network Security

- All endpoints must use HTTPS
- Configuration files should have restricted permissions: `chmod 600 ~/.x402-claude-mcp/endpoints.json`

### Production Security Checklist

- [ ] `PRIVATE_KEY` set as environment variable (not in code)
- [ ] `endpoints.json` uses `${PRIVATE_KEY}` template
- [ ] Wallet has sufficient USDC balance for expected usage
- [ ] Endpoints are marked `trusted: true` only after verification
- [ ] Monitor transaction logs for unexpected payments
- [ ] Set up alerts for low USDC balance
- [ ] Test on testnet (base-sepolia) before production
- [ ] Use separate wallets for different environments

## License

Apache-2.0

## Contributing

Contributions are welcome! Please open an issue or pull request.

## Support

For issues and questions:
- GitHub Issues: https://github.com/Must-be-Ash/x402-claude-mcp/issues
- Documentation: https://docs.cdp.coinbase.com/x402/

## Related Projects

- [x402 Protocol](https://docs.cdp.coinbase.com/x402/)
- [Coinbase Developer Platform](https://docs.cdp.coinbase.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
# x402-claude-mcp
