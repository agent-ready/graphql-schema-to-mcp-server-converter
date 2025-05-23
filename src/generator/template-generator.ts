import { CONFIG } from "./config.js";
import { generateGraphQLOperation } from "./graphql-utils.js";
import type { ToolWithField } from "./types.js";

export function generatePackageJson(): string {
	return `{
  "name": "${CONFIG.PACKAGE_NAME}",
  "version": "${CONFIG.PACKAGE_VERSION}",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc-watch --onSuccess \\"node dist/index.js\\"",
    "start": "node dist/index.js",
    "clean": "rm -rf dist"
  },
  "dependencies": ${JSON.stringify(CONFIG.DEPENDENCIES, null, 2)},
  "devDependencies": ${JSON.stringify(CONFIG.DEV_DEPENDENCIES, null, 2)}
}`;
}

export function generateTsConfig(): string {
	return `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "dist"]
}`;
}

export function generateServerFile(): string {
	return `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export async function main(port: number = 3000) {
  const server = new McpServer({
    name: "${CONFIG.PACKAGE_NAME}",
    version: "${CONFIG.PACKAGE_VERSION}",
    description: "${CONFIG.PACKAGE_DESCRIPTION}",
  });

  // Register all tools
  registerTools(server);

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("MCP Server running on stdio");
  console.error("Connected to domain:", process.env.ENDPOINT);
}

// Start the server
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});`;
}

export function generateToolsFile(toolsWithFields: ToolWithField[]): string {
	// Collect all unique types
	const uniqueTypes = new Set<string>();
	const enumTypes = new Set<string>();
	for (const { tool } of toolsWithFields) {
		for (const type of Object.values(tool.inputTypes)) {
			if (["string", "number", "boolean"].includes(type)) continue;
			if (!type.startsWith("Schema.")) {
				enumTypes.add(type);
			} else {
				uniqueTypes.add(type.split(".").pop() ?? type);
			}
		}
	}

	const typeImports = Array.from(uniqueTypes)
		.map((type) => `import { ${type} } from "./schema.js";`)
		.join("\n");
	const enumImports = Array.from(enumTypes)
		.map((type) => `import { ${type} } from "./schema.js";`)
		.join("\n");

	const toolRegistrations = toolsWithFields
		.map(({ tool, field, rootTypeName }) => {
			const schemaString = Object.entries(tool.inputSchema)
				.map(([key, value]) => {
					return `    ${key}: ${value}`;
				})
				.join(",\n");

			const escapedDescription = tool.description
				.replace(/"/g, '\\"')
				.replace(/\n/g, "\\n");

			const handlerString = `async (input, extra) => {
        try {
          const headers: Record<string, string> = {};
          
          if (process.env.HEADERS) {
            try {
              const envHeaders = JSON.parse(process.env.HEADERS);
              Object.assign(headers, envHeaders);
            } catch (e) {
              console.error("Failed to parse HEADERS:", e);
            }
          }

          const result = await graphqlRequest<Record<string, unknown>>(
            process.env.ENDPOINT || "${CONFIG.DEFAULT_ENDPOINT}",
            \`${generateGraphQLOperation(field, rootTypeName)}\`,
            input,
            headers
          );

          if (!result["${field.name}"]) {
            return {
              content: [{ type: "text" as const, text: \`No data returned for ${field.name}\` }],
              isError: true
            };
          }

          return {
            content: [{ type: "text" as const, text: JSON.stringify(result["${field.name}"]) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text" as const, text: \`Failed to execute ${field.name}: \${error}\` }],
            isError: true
          };
        }
      }`;

			return `  server.tool(
    \"${tool.name}\",
    \"${escapedDescription}\",
    {
${schemaString}
    },
    ${handlerString}
  );`;
		})
		.join("\n\n");

	return `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { graphqlRequest } from "./utils/graphql-client.js";
import * as Schema from "./schema.js";
${typeImports}
${enumImports}

export function registerTools(server: McpServer): void {
${toolRegistrations}
}`;
}
