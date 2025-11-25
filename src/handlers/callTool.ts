import type { EndpointRegistry } from '../registry/EndpointRegistry.js';
import type { PaymentHandler } from '../payment/PaymentHandler.js';
import { TrustError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * MCP tool call request structure
 */
interface ToolCallRequest {
  params: {
    name: string;
    arguments?: Record<string, any>;
  };
}

/**
 * MCP tool call response structure
 */
export interface ToolCallResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown; // Allow additional properties for MCP compatibility
}

/**
 * Handle the MCP tools/call request
 * Executes an x402 endpoint with automatic payment
 */
export async function handleCallTool(
  request: ToolCallRequest,
  registry: EndpointRegistry,
  paymentHandler: PaymentHandler
): Promise<ToolCallResponse> {
  try {
    const { name, arguments: args = {} } = request.params;

    logger.debug(`Tool call request: ${name}`, { arguments: args });

    // Look up endpoint by ID
    const endpoint = registry.getEndpoint(name);
    if (!endpoint) {
      throw new ValidationError(
        `Unknown tool: "${name}". Available tools: ${registry
          .getAllEndpoints()
          .map(e => e.id)
          .join(', ')}`,
        'name'
      );
    }

    // Check if endpoint is trusted
    if (!endpoint.trusted) {
      throw new TrustError(name);
    }

    // Validate arguments against schema (basic validation)
    validateArguments(args, endpoint.parameters.required || []);

    // Call the endpoint with payment handling
    const result = await paymentHandler.callEndpoint(endpoint, args);

    // Return success response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Tool call failed', {
      tool: request.params.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return error response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : 'Unknown error',
              tool: request.params.name,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Validate that all required parameters are present
 */
function validateArguments(args: Record<string, any>, required: string[]): void {
  for (const requiredParam of required) {
    if (!(requiredParam in args)) {
      throw new ValidationError(
        `Missing required parameter: "${requiredParam}"`,
        requiredParam
      );
    }

    if (args[requiredParam] === undefined || args[requiredParam] === null) {
      throw new ValidationError(
        `Parameter "${requiredParam}" cannot be null or undefined`,
        requiredParam
      );
    }
  }
}
