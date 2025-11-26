# x402 Claude MCP Server - Examples

This directory contains examples of how to use the x402 Agent MCP Server in different scenarios.

## Available Examples

### 1. Basic Setup (`basic/`)

The simplest way to get started with Claude Desktop.

**What it shows:**
- Installing the MCP server
- Configuring Claude Desktop
- Using x402 endpoints (minifetch metadata extraction)

**Best for:** First-time users, Claude Desktop users

[View Basic Example →](./basic/)

---

### 2. Node.js Backend Integration (`nodejs-backend/`)

Integrate x402 payments into a Node.js web application.

**What it shows:**
- Starting MCP server as a child process
- Exposing x402 tools via REST API
- Production deployment patterns
- Health checks and monitoring
- Multiple x402 endpoints (metadata extraction, QR code generation)

**Best for:** Backend developers, production deployments

[View Node.js Backend Example →](./nodejs-backend/)

---

## Quick Start

### Option 1: Claude Desktop (Easiest)

```bash
cd basic
# Follow the README instructions
```

### Option 2: Node.js Backend

```bash
cd nodejs-backend
npm install
export PRIVATE_KEY="0x..."
node server.js
```

## Prerequisites

All examples require:
- Node.js >= 18.0.0
- A CDP wallet with USDC balance on Base
- The x402 Agent MCP Server installed

## Configuration

Each example includes its own `endpoints.json` file with x402 endpoint definitions. You can customize these to use your preferred x402 services.

### Example endpoint configuration:

```json
{
  "wallet": {
    "provider": "cdp-embedded",
    "network": "base",
    "privateKey": "${PRIVATE_KEY}"
  },
  "endpoints": [
    {
      "id": "my_endpoint",
      "name": "My x402 Service",
      "url": "https://api.example.com/x402/endpoint",
      "method": "POST",
      "description": "Description of what this endpoint does",
      "parameters": { /* JSON Schema */ },
      "estimatedCost": "$0.01",
      "trusted": true
    }
  ]
}
```

## Environment Variables

All examples use the same environment variables:

```bash
PRIVATE_KEY=0x...              # Required: Your CDP wallet private key
X402_CONFIG_PATH=./endpoints.json  # Optional: Path to config file
DEBUG=true                         # Optional: Enable debug logging
```

## Security Best Practices

1. **Never commit private keys** - Use environment variables
2. **Separate wallets per environment** - dev, staging, prod
3. **Monitor wallet balance** - Set up alerts for low USDC
4. **Verify transactions** - Check BaseScan for all payments
5. **Use trusted endpoints only** - Review before setting `trusted: true`

## Common Issues

### "MCP server not starting"
- Check that `x402-claude-mcp` is installed
- Verify PRIVATE_KEY is set
- Check endpoints.json syntax

### "Payment failures"
- Ensure wallet has USDC balance on Base
- Verify private key is correct
- Check network configuration

### "Endpoints not appearing"
- Restart your MCP client (Claude Desktop, etc.)
- Verify `trusted: true` in endpoints.json
- Check server logs for errors

## Learn More

- [Main README](../README.md) - Full documentation
- [GitHub Repository](https://github.com/Must-be-Ash/x402-claude-mcp)
- [x402 Protocol](https://x402.org/)
- [Coinbase Developer Platform](https://docs.cdp.coinbase.com/)

## Contributing

Have an example to share? Submit a PR!

Ideas for new examples:
- Multi-agent systems using multiple x402 endpoints
- Data analysis pipelines with x402 data sources
- Automated workflows with x402 services
- Integration with AI applications

## Support

- GitHub Issues: https://github.com/Must-be-Ash/x402-claude-mcp/issues
- Documentation: https://github.com/Must-be-Ash/x402-claude-mcp#readme
