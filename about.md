  x402 Agent MCP Server - An npm package that handles x402 micropayments automatically for LLM applications.

  What Developers Get

  npm install @x402-agent/mcp-server

  Developers get:

  1. Automatic x402 Payment Handling - Define endpoints in JSON, the MCP server handles all USDC payments on Base network
  automatically
  2. Plug & Play for LLMs - Works with Claude Desktop, custom Node.js apps, or any MCP client - just configure and go
  3. Zero Payment Logic Required - No need to implement x402 protocol, wallet management, or transaction handling - it's
  all done for you

  How it works:
  - Developer creates endpoints.json with x402 API endpoints they want to use
  - Sets PRIVATE_KEY environment variable
  - LLM agent can now call those x402 endpoints autonomously
  - Returns API results + transaction confirmations (BaseScan URLs)

  Example endpoints included:
  - URL metadata extraction (minifetch)
  - QR code generation
  - Video generation (Sora)
  - Polymarket data
  - GIF search

  Key benefit: Developers building AI agents can integrate paid APIs without writing any payment code - just define the
  endpoints and let the MCP server handle payments.