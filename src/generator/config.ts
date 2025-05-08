import * as dotenv from "dotenv";
import {
	type CustomTypeProcessor,
	CustomTypeProcessors,
} from "./custom-type-processor.js";
dotenv.config();

export const CONFIG = {
	MAX_RESPONSE_DEPTH: process.env.MAX_RESPONSE_DEPTH
		? Number.parseInt(process.env.MAX_RESPONSE_DEPTH)
		: 2,
	DEFAULT_ENDPOINT: process.env.ENDPOINT || "http://localhost:3000/graphql",
	PACKAGE_NAME: process.env.PACKAGE_NAME || "graphql-mcp-tools",
	PACKAGE_VERSION: process.env.PACKAGE_VERSION || "1.0.1",
	PACKAGE_DESCRIPTION:
		process.env.PACKAGE_DESCRIPTION || "GraphQL API integration tools for MCP",
	CUSTOM_TYPE_PROCESSORS: CustomTypeProcessors as CustomTypeProcessor[],
	DEPENDENCIES: {
		"@modelcontextprotocol/sdk": "^1.11.0",
		dotenv: "^16.4.5",
		zod: "^3.24.4",
	},
	DEV_DEPENDENCIES: {
		"ts-node": "^10.9.2",
		typescript: "^5.8.3",
		"tsc-watch": "^6.0.4",
	},
} as const;

export type Config = typeof CONFIG;
