import { z, ZodTypeAny } from 'zod';
import { JSONSchema } from '../registry/types.js';
import { SchemaConversionError } from './errors.js';

/**
 * Converts a JSON Schema object to a Zod ZodRawShape for MCP tool registration
 * Returns undefined if schema has no properties (tool takes no parameters)
 *
 * @param schema - JSON Schema object to convert
 * @returns ZodRawShape for use with MCP SDK registerTool(), or undefined if no parameters
 * @throws SchemaConversionError if schema cannot be converted
 */
export function jsonSchemaToZod(schema: JSONSchema) {
  // Validate root schema is object type
  if (!schema || schema.type !== 'object') {
    throw new SchemaConversionError(
      'Root schema must be type "object"',
      schema?.type
    );
  }

  // Handle empty properties (no parameters)
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return undefined;
  }

  const zodShape: any = {};
  const required = schema.required || [];

  // Convert each property
  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    let zodType = jsonSchemaPropertyToZod(propSchema, propName);

    // Add description if present
    if (propSchema.description) {
      zodType = zodType.describe(propSchema.description);
    }

    // Make optional if not in required array
    if (!required.includes(propName)) {
      zodType = zodType.optional();
    }

    zodShape[propName] = zodType;
  }

  // Return plain object - SDK will wrap with z.object() automatically
  return zodShape;
}

/**
 * Converts a single JSON Schema property to a Zod type
 * Supports: string, number, boolean, array, object
 *
 * @param propSchema - JSON Schema property definition
 * @param propertyPath - Path to property for error messages
 * @returns Zod type for the property
 * @throws SchemaConversionError if property type is unsupported
 */
function jsonSchemaPropertyToZod(
  propSchema: JSONSchema,
  propertyPath: string
): ZodTypeAny {
  const type = propSchema.type;

  switch (type) {
    case 'string':
      if (propSchema.enum) {
        // Handle string enums
        if (propSchema.enum.length === 0) {
          throw new SchemaConversionError(
            `Empty enum array for property "${propertyPath}"`,
            'string',
            propertyPath
          );
        }
        return z.enum(propSchema.enum as [string, ...string[]]);
      }
      return z.string();

    case 'number':
      return z.number();

    case 'boolean':
      return z.boolean();

    case 'array':
      if (!propSchema.items) {
        throw new SchemaConversionError(
          `Array type missing "items" definition for property "${propertyPath}"`,
          'array',
          propertyPath
        );
      }
      const itemSchema = jsonSchemaPropertyToZod(
        propSchema.items,
        `${propertyPath}[]`
      );
      return z.array(itemSchema);

    case 'object':
      // Recursive object handling
      const nestedSchema = jsonSchemaToZod(propSchema);
      return nestedSchema ? z.object(nestedSchema) : z.object({});

    default:
      throw new SchemaConversionError(
        `Unsupported JSON Schema type "${type}" for property "${propertyPath}". ` +
        `Supported types: string, number, boolean, array, object`,
        type,
        propertyPath
      );
  }
}
