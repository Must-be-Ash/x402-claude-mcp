  What You Do:

  1. In your /Users/ashnouruzi/x402-agent-demo project:
    - Add x402-agent as an MCP server to your LLM chat UI
    - Create x402-endpoints.json with the APIs you want
    - Set PRIVATE_KEY environment variable
  2. That's it!

  What x402-agent Handles Automatically:

  ✅ All x402 Protocol Logic
  - 402 payment required detection
  - Facilitator communication
  - Payment settlement
  - Transaction signing
  - Payment proof submission
  - Retry logic

  ✅ All Wallet Management
  - USDC transactions on Base
  - Transaction signing with your private key
  - Gas estimation and handling

  ✅ All MCP Integration
  - Exposes your endpoints as MCP tools
  - LLM discovers and uses them dynamically
  - Returns API responses + transaction confirmations

  Your Setup:

  cd /Users/ashnouruzi/x402-agent-demo

  # 1. Create config
  cat > x402-endpoints.json << 'EOF'
  {
    "wallet": {
      "provider": "cdp-embedded",
      "network": "base",
      "privateKey": "${PRIVATE_KEY}"
    },
    "endpoints": [
      {
        "id": "qr_code_generator",
        "name": "Generate QR Code",
        "url": "https://xluihnzwcmxybtygewvy.supabase.co/functions/v1/url-qr-
  code-generator",
        "method": "POST",
        "description": "Generates a QR code image for any URL...",
        "parameters": {
          "type": "object",
          "properties": {
            "url": {"type": "string"}
          },
          "required": ["url"]
        },
        "estimatedCost": "$0.01",
        "trusted": true
      }
    ]
  }
  EOF

  # 2. Set private key
  export PRIVATE_KEY="0x..."

  # 3. Start MCP server
  npx x402-agent

  In Your LLM UI Code:

  import { Client } from '@modelcontextprotocol/sdk/client/index.js';
  import { StdioClientTransport } from
  '@modelcontextprotocol/sdk/client/stdio.js';

  // Connect to x402-agent MCP server
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['x402-agent'],
    env: {
      PRIVATE_KEY: process.env.PRIVATE_KEY,
      X402_CONFIG_PATH: './x402-endpoints.json'
    }
  });

  const client = new Client({ name: 'my-chat-ui', version: '1.0.0' }, {});
  await client.connect(transport);

  // Now your LLM can use the tools!
  // User: "Make a QR code for google.com"
  // LLM calls: qr_code_generator tool
  // x402-agent: Handles payment, returns QR code + tx hash

  You literally just run npx x402-agent and define endpoints - it handles ALL
   the x402 complexity! 🎯