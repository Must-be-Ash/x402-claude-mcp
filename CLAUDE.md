# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that enables LLM agents to autonomously call x402-protected APIs using CDP embedded wallets. The server exposes configured x402 endpoints as MCP tools, allowing agents to discover and use paid APIs with automatic payment handling.

## Development Commands

```bash
# Build TypeScript to dist/
npm run build

# Development mode with hot reload
npm run dev

# Run the compiled server
npm start

# Run directly with tsx (bypasses build)
tsx src/index.ts
```

## Architecture Overview

### Core Components

1. **MCP Server Layer** (`src/server.ts`, `src/index.ts`)
   - Entry point creates MCP server using `@modelcontextprotocol/sdk`
   - Registers two handlers: `tools/list` and `tools/call`
   - Uses stdio transport for communication with MCP clients

2. **Endpoint Registry** (`src/registry/`)
   - `EndpointRegistry.ts`: Loads and manages endpoint configurations from JSON
   - `validator.ts`: Validates configuration against schema requirements
   - `types.ts`: TypeScript interfaces for Config, Endpoint, WalletConfig
   - Supports environment variable interpolation (e.g., `${PRIVATE_KEY}`)

3. **Payment System** (`src/payment/`)
   - `WalletManager.ts`: Initializes CDP embedded wallets using viem
   - `PaymentHandler.ts`: Wraps fetch with x402-fetch for automatic payment
   - Extracts transaction hash from `X-PAYMENT-RESPONSE` header
   - Supports Base, Base Sepolia, Ethereum, and Sepolia networks

4. **Request Handlers** (`src/handlers/`)
   - `listTools.ts`: Converts endpoints to MCP tool definitions
   - `callTool.ts`: Validates trust, checks params, calls endpoint with payment

5. **Utilities** (`src/utils/`)
   - `errors.ts`: Custom error classes (ConfigError, PaymentError, TrustError, etc.)
   - `logger.ts`: Structured logging with transaction tracking
   - `retry.ts`: Exponential backoff retry logic

### Configuration Flow

1. Loads `~/.x402-claude-mcp/endpoints.json` (or path from `X402_CONFIG_PATH`)
2. Interpolates environment variables using `${VAR_NAME}` syntax
3. Validates config structure and required fields
4. Builds endpoint lookup map for O(1) access
5. Initializes wallet with private key and network

### Endpoint Call Flow

1. MCP client sends `tools/call` request with endpoint name and params
2. `callTool` handler looks up endpoint by ID
3. Validates endpoint is trusted (must have `trusted: true`)
4. Validates required parameters are present
5. `PaymentHandler.callEndpoint()` makes HTTP request
6. `wrapFetchWithPayment` intercepts 402 responses and pays automatically
7. Returns response data + transaction hash

### Trust Model

Only endpoints with `"trusted": true` can be called. This prevents:
- Unauthorized spending on unknown endpoints
- Malicious endpoint injection
- Unintended payment execution

## Key Patterns

### Environment Variable Interpolation
Config files use `${VAR_NAME}` syntax which gets replaced at runtime:
```json
{
  "wallet": {
    "privateKey": "${PRIVATE_KEY}"
  }
}
```

### Error Handling
Custom error classes provide context:
- `ConfigError`: Configuration/initialization issues
- `TrustError`: Untrusted endpoint call attempts
- `PaymentError`: Payment-related failures
- `NetworkError`: HTTP/network issues
- `ValidationError`: Parameter validation failures

### Retry Logic
`PaymentHandler` uses exponential backoff with configurable:
- `maxRetries`: 3 by default
- `initialDelay`: 100ms
- `maxDelay`: 5000ms

## Testing & Debugging

Set `DEBUG=true` environment variable for verbose logging:
```bash
DEBUG=true npm run dev
```

Transaction logs include:
- Endpoint ID
- Transaction hash
- Status (success/failed)
- Error messages

## Configuration Requirements

Endpoints must include:
- `id`: Unique snake_case identifier
- `name`: Human-readable name
- `url`: HTTPS URL
- `method`: HTTP method (GET/POST/PUT/PATCH/DELETE)
- `description`: Minimum 20 characters
- `parameters`: JSON Schema with properties and required fields
- `trusted`: Boolean (must be true for autonomous calls)

Optional fields:
- `category`: Grouping category
- `estimatedCost`: Display cost estimate

## Module System

Project uses ES modules (`"type": "module"` in package.json):
- All imports must use `.js` extension (even for `.ts` files)
- Use `import` instead of `require`
- Top-level `await` supported

## Key Dependencies

- `@modelcontextprotocol/sdk`: MCP server implementation
- `viem`: Ethereum wallet client and utilities
- `x402-fetch`: Wraps fetch with automatic payment handling
- `dotenv`: Environment variable loading
