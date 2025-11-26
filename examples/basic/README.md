# Basic Setup Example

This example shows the simplest way to use the x402 Agent MCP Server with Claude Desktop.

## Prerequisites

- Node.js >= 18.0.0
- Claude Desktop installed
- A CDP wallet with USDC balance

## Setup

### 1. Install the MCP server globally or use npx

```bash
npm install -g @x402-agent/mcp-server
```

Or use with npx (no installation required):
```bash
npx @x402-agent/mcp-server
```

### 2. Create your endpoints configuration

Copy the `endpoints.json` file from this directory to `~/.x402-agent/endpoints.json`:

```bash
mkdir -p ~/.x402-agent
cp endpoints.json ~/.x402-agent/endpoints.json
```

### 3. Set your CDP private key

```bash
export PRIVATE_KEY="0x..."
```

Or create a `.env` file in your home directory:
```bash
echo "PRIVATE_KEY=0x..." > ~/.env
```

### 4. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402-agent": {
      "command": "npx",
      "args": ["-y", "@x402-agent/mcp-server"],
      "env": {
        "PRIVATE_KEY": "your-private-key-here"
      }
    }
  }
}
```

**Note**: Replace `"your-private-key-here"` with your actual CDP private key, or use an environment variable.

### 5. Restart Claude Desktop

Quit Claude Desktop completely and restart it. The x402 agent tools will now be available.

## Usage

In Claude Desktop, you can now use commands like:

```
User: "Extract metadata from https://example.com"
Claude: [Uses minifetch_extract_metadata tool]
        [Payment automatically handled]
        [Returns metadata + transaction hash]
```

## Verify Payments

All payments are logged and can be verified on BaseScan:
- Check transaction logs in Claude Desktop
- Visit `https://basescan.org/tx/[transaction-hash]`
- Monitor your wallet balance

## Troubleshooting

### Tools not appearing
- Restart Claude Desktop completely
- Check that endpoints.json has `"trusted": true`
- Verify PRIVATE_KEY is set correctly

### Payment failures
- Ensure wallet has sufficient USDC balance
- Check network is set to "base" in endpoints.json
- Verify private key format (should start with 0x)

### Configuration errors
- Validate JSON syntax with: `cat ~/.x402-agent/endpoints.json | jq`
- Check file permissions: `chmod 600 ~/.x402-agent/endpoints.json`
