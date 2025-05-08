import * as fs from "node:fs";
import * as path from "node:path";
import { GraphQLObjectType, type GraphQLSchema } from "graphql";
import { generateInputSchema, isOperationField } from "./graphql-utils.js";
import {
	generatePackageJson,
	generateServerFile,
	generateToolsFile,
	generateTsConfig,
} from "./template-generator.js";
import type { ToolWithField } from "./types.js";

export function generateToolsFromSchema(
	schema: GraphQLSchema,
): ToolWithField[] {
	const tools: ToolWithField[] = [];

	// Only process root Query and Mutation types
	const rootTypeNames: string[] = [];
	if (schema.getQueryType())
		rootTypeNames.push(schema.getQueryType()?.name ?? "");
	if (schema.getMutationType())
		rootTypeNames.push(schema.getMutationType()?.name ?? "");

	const typeMap = schema.getTypeMap();

	for (const [typeName, type] of Object.entries(typeMap)) {
		// Only process root types
		if (!rootTypeNames.includes(typeName)) {
			continue;
		}
		if (!(type instanceof GraphQLObjectType)) {
			continue;
		}

		const fields = type.getFields();

		for (const [fieldName, field] of Object.entries(fields)) {
			if (!isOperationField(field)) {
				continue;
			}

			const toolName = fieldName;
			const { schema: inputSchema, types: inputTypes } =
				generateInputSchema(field);

			tools.push({
				tool: {
					name: toolName,
					description: field.description || `${fieldName} operation`,
					inputSchema,
					inputTypes,
				},
				field,
				rootTypeName: typeName,
			});
		}
	}

	return tools;
}

export function generateServerFiles(
	schema: GraphQLSchema,
	outputDir = "out",
): void {
	const toolsWithFields = generateToolsFromSchema(schema);

	// Ensure output directory exists
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Copy environment variables
	copyEnvFile(outputDir);

	// Ensure utils directory exists
	const utilsDir = path.join(outputDir, "utils");
	if (!fs.existsSync(utilsDir)) {
		fs.mkdirSync(utilsDir, { recursive: true });
	}

	// Copy utility files
	fs.copyFileSync(
		path.join("src", "utils", "graphql-client.ts"),
		path.join(utilsDir, "graphql-client.ts"),
	);
	fs.writeFileSync(
		path.join(utilsDir, "index.d.ts"),
		`export function graphqlRequest(endpoint: string, operation: string, variables: Record<string, any>): Promise<any>;
export function formatSuccess(data: any): { success: true; data: any };
export function handleError(message: string, error: any): { success: false; error: string };`,
	);

	// Generate tools.ts file
	const toolsContent = generateToolsFile(toolsWithFields);
	fs.writeFileSync(path.join(outputDir, "tools.ts"), toolsContent);

	// Generate server.ts file
	const serverContent = generateServerFile();
	fs.writeFileSync(path.join(outputDir, "index.ts"), serverContent);

	// Generate package.json
	const packageJsonContent = generatePackageJson();
	fs.writeFileSync(path.join(outputDir, "package.json"), packageJsonContent);

	const tsConfigContent = generateTsConfig();
	fs.writeFileSync(path.join(outputDir, "tsconfig.json"), tsConfigContent);
}

function copyEnvFile(outputDir: string): void {
	const rootEnvPath = path.join(process.cwd(), ".env");
	const outputEnvPath = path.join(outputDir, ".env");

	if (fs.existsSync(rootEnvPath)) {
		const envContent = fs.readFileSync(rootEnvPath, "utf-8");
		fs.writeFileSync(outputEnvPath, envContent);
		console.log("Copied .env file to output directory");
	} else {
		console.warn("No .env file found in root directory");
	}
}
