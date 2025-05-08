import { type GraphQLField, GraphQLSchema } from "graphql";
import type { z } from "zod";

export interface MCPResponse {
	content: MCPContent[];
	isError?: boolean;
	error?: unknown;
	data?: unknown;
}

type MCPContent =
	| { type: "text"; text: string }
	| { type: "image"; data: string; mimeType: string }
	| { type: "audio"; data: string; mimeType: string }
	| {
			type: "resource";
			resource:
				| { text: string; uri: string; mimeType?: string }
				| { uri: string; blob: string; mimeType?: string };
	  };

export interface ToolConfig {
	name: string;
	description: string;
	inputSchema: Record<string, string | z.ZodType>;
	inputTypes: Record<string, string>;
}

export interface ToolWithField {
	tool: ToolConfig;
	field: GraphQLField<unknown, unknown>;
	rootTypeName: string;
}

export interface InputSchemaResult {
	schema: Record<string, string>;
	types: Record<string, string>;
}

export interface GraphQLOperationResult {
	operation: string;
	variables: Record<string, unknown>;
}
