import type { EndpointRegistry } from '../registry/EndpointRegistry.js';
import type { MCPTool } from '../registry/types.js';

/**
 * Handle the MCP tools/list request
 * Returns all configured endpoints as MCP tools
 */
export function handleListTools(registry: EndpointRegistry): { tools: MCPTool[] } {
  // Get all endpoints from registry
  const endpoints = registry.getAllEndpoints();

  // Map endpoints to MCP tool format
  const tools: MCPTool[] = endpoints.map(endpoint => ({
    name: endpoint.id,
    description: endpoint.description,
    inputSchema: endpoint.parameters,
  }));

  return { tools };
}
