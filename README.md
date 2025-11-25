# x402 Agent MCP Server

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

## Installation

### Global Installation

```bash
npm install -g @x402-agent/mcp-server
```

### Or Use with npx

```bash
npx @x402-agent/mcp-server
```

## Configuration

### 1. Create Configuration Directory

```bash
mkdir -p ~/.x402-agent
```

### 2. Create Endpoint Configuration

Create `~/.x402-agent/endpoints.json`:

```json
{
  "wallet": {
    "provider": "cdp-embedded",
    "network": "base",
    "privateKey": "${CDP_PRIVATE_KEY}"
  },
  "endpoints": [
    {
      "id": "firecrawl_search",
      "name": "Web Search",
      "url": "https://api.firecrawl.dev/v2/x402/search",
      "method": "POST",
      "description": "Search the web for current information using Firecrawl. Returns recent web results with titles, URLs, and snippets.",
      "category": "search",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "The search query"
          },
          "maxResults": {
            "type": "number",
            "description": "Maximum number of results (default: 10)"
          }
        },
        "required": ["query"]
      },
      "estimatedCost": "$0.01-$0.05",
      "trusted": true
    }
  ]
}
```

See `config/endpoints.example.json` for a complete example with multiple endpoints.

### 3. Set Environment Variables

Create a `.env` file or set environment variables:

```bash
export CDP_PRIVATE_KEY="0x..."
export X402_CONFIG_PATH="~/.x402-agent/endpoints.json"  # Optional, defaults to this
export DEBUG="false"  # Set to "true" for debug logging
```

### 4. Configure Your MCP Client

#### Claude Desktop (macOS)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402-agent": {
      "command": "npx",
      "args": ["-y", "@x402-agent/mcp-server"],
      "env": {
        "CDP_PRIVATE_KEY": "0x...",
        "X402_CONFIG_PATH": "~/.x402-agent/endpoints.json"
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
    "x402-agent": {
      "command": "npx @x402-agent/mcp-server",
      "env": {
        "CDP_PRIVATE_KEY": "0x...",
        "X402_CONFIG_PATH": "~/.x402-agent/endpoints.json"
      }
    }
  }
}
```

#### Codex CLI

Edit `~/.codex/config.toml`:

```toml
[[mcpServers]]
name = "x402-agent"
command = "npx"
args = ["@x402-agent/mcp-server"]

[mcpServers.env]
CDP_PRIVATE_KEY = "0x..."
X402_CONFIG_PATH = "~/.x402-agent/endpoints.json"
```

## Usage

Once configured, your LLM agent can autonomously use the endpoints:

```
User: "Search for the latest AI news and summarize the top 3 results"

Agent: [Calls firecrawl_search tool]
       [Payment automatically handled via x402]
       [Receives results and summarizes]
```

The agent will:
1. Discover available tools via `tools/list`
2. Call endpoints via `tools/call`
3. Handle 402 payment responses automatically
4. Return results to the user

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

- `CDP_PRIVATE_KEY`: Your CDP wallet private key (required)
- `X402_CONFIG_PATH`: Path to endpoints.json (default: `~/.x402-agent/endpoints.json`)
- `DEBUG`: Enable debug logging (default: `false`)

## Development

### Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/x402-agent.git
cd x402-agent

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

### Project Structure

```
x402-agent/
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
- Verify CDP_PRIVATE_KEY is set correctly
- Check configuration file syntax: `cat ~/.x402-agent/endpoints.json | jq`

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

### Private Key Safety

- Never commit private keys to version control
- Use environment variables for sensitive data
- Keep `.env` files out of git (use `.gitignore`)
- Rotate keys periodically

### Network Security

- All endpoints must use HTTPS
- Configuration files should have restricted permissions: `chmod 600 ~/.x402-agent/endpoints.json`

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request.

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/x402-agent/issues
- Documentation: https://docs.cdp.coinbase.com/x402/

## Related Projects

- [x402 Protocol](https://docs.cdp.coinbase.com/x402/)
- [Coinbase Developer Platform](https://docs.cdp.coinbase.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
# x402-agent
