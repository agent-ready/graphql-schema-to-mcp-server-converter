import * as fs from "node:fs";
import * as path from "node:path";
import { type GraphQLSchema, buildClientSchema } from "graphql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	generateServerFiles,
	generateToolsFromSchema,
} from "../generator/index.js";
import type { ToolWithField } from "../generator/types.js";

describe("generator", () => {
	let schema: GraphQLSchema;

	beforeAll(() => {
		// Load the schema from the JSON file
		const schemaPath = path.join(__dirname, "../../in/schema.json");
		const schemaJson = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
		schema = buildClientSchema(schemaJson.data);
	});

	describe("generateToolsFromSchema", () => {
		it("should generate tools with correct structure", () => {
			const toolsWithFields = generateToolsFromSchema(schema);
			expect(toolsWithFields).toBeDefined();
			expect(Array.isArray(toolsWithFields)).toBe(true);
			expect(toolsWithFields.length).toBeGreaterThan(0);

			// Check each tool has required properties
			for (const { tool } of toolsWithFields) {
				expect(tool).toHaveProperty("name");
				expect(tool).toHaveProperty("description");
				expect(tool).toHaveProperty("inputSchema");
				expect(tool).toHaveProperty("inputTypes");
			}
		});

		it("should generate tools for query fields", () => {
			const tools = generateToolsFromSchema(schema);

			// Find a query tool
			const queryTool = tools.find((t) => t.rootTypeName === "QueryRoot");
			expect(queryTool).toBeDefined();
			expect(queryTool?.tool.name).toBeDefined();
			expect(queryTool?.tool.description).toBeDefined();
			expect(queryTool?.tool.inputSchema).toBeDefined();
			expect(queryTool?.tool.inputTypes).toBeDefined();
		});

		it("should generate tools for mutation fields", () => {
			const tools = generateToolsFromSchema(schema);

			// Find a mutation tool
			const mutationTool = tools.find((t) => t.rootTypeName === "Mutation");
			expect(mutationTool).toBeDefined();
			expect(mutationTool?.tool.name).toBeDefined();
			expect(mutationTool?.tool.description).toBeDefined();
			expect(mutationTool?.tool.inputSchema).toBeDefined();
			expect(mutationTool?.tool.inputTypes).toBeDefined();
		});

		it("should handle fields with input types", () => {
			const tools = generateToolsFromSchema(schema);

			// Find a tool with input type
			const toolWithInput = tools.find((t) =>
				Object.values(t.tool.inputTypes).some((type) =>
					type.startsWith("Schema."),
				),
			);

			expect(toolWithInput).toBeDefined();
			expect(toolWithInput?.tool.inputSchema).toBeDefined();
			expect(
				Object.keys(toolWithInput?.tool.inputSchema || {}).length,
			).toBeGreaterThan(0);
		});

		it("should handle fields with scalar types", () => {
			const tools = generateToolsFromSchema(schema);

			// Find a tool with scalar type
			const toolWithScalar = tools.find((t) =>
				Object.values(t.tool.inputTypes).some((type) =>
					["string", "number", "boolean"].includes(type),
				),
			);

			expect(toolWithScalar).toBeDefined();
			expect(toolWithScalar?.tool.inputSchema).toBeDefined();
			expect(
				Object.keys(toolWithScalar?.tool.inputSchema || {}).length,
			).toBeGreaterThan(0);
		});

		it("should correctly convert the 'products' query to a tool", () => {
			const tools = generateToolsFromSchema(schema);
			const productsTool = tools.find((t) => t.tool.name === "products");
			expect(productsTool).toBeDefined();
			// Check name
			expect(productsTool?.tool.name).toBe("products");
			// Check description
			expect(productsTool?.tool.description).toContain(
				"Returns a list of the shop's products",
			);
			// Check input schema fields
			expect(productsTool?.tool.inputSchema).toMatchObject({
				after: expect.stringContaining("z.string()"),
				before: expect.stringContaining("z.string()"),
				first: expect.stringContaining("z.number().int()"),
				last: expect.stringContaining("z.number().int()"),
				query: expect.stringContaining("z.string()"),
				reverse: expect.stringContaining("z.boolean()"),
				sortKey: expect.stringContaining("z.nativeEnum(ProductSortKeys)"),
			});
			// Check input types
			expect(productsTool?.tool.inputTypes).toMatchObject({
				after: "string",
				before: "string",
				first: "number",
				last: "number",
				query: "string",
				reverse: "boolean",
				sortKey: "ProductSortKeys",
			});
		});

		it("should generate cartCreate tool with correct structure", () => {
			const toolsWithFields = generateToolsFromSchema(schema);
			const cartCreateTool = toolsWithFields.find(
				({ tool }: ToolWithField) => tool.name === "cartCreate",
			);
			expect(cartCreateTool).toBeDefined();
			expect(cartCreateTool?.tool.description).toContain("cart");
			expect(cartCreateTool?.tool.inputSchema).toHaveProperty("input");
		});

		it("should generate cartLinesAdd tool with correct structure", () => {
			const toolsWithFields = generateToolsFromSchema(schema);
			const cartLinesAddTool = toolsWithFields.find(
				({ tool }: ToolWithField) => tool.name === "cartLinesAdd",
			);
			expect(cartLinesAddTool).toBeDefined();
			expect(cartLinesAddTool?.tool.description).toContain("cart");
			expect(cartLinesAddTool?.tool.inputSchema).toHaveProperty("cartId");
			expect(cartLinesAddTool?.tool.inputSchema).toHaveProperty("lines");
		});
	});

	describe("generateServerFiles", () => {
		const testOutputDir = path.join(__dirname, "../../test-output");

		beforeEach(() => {
			// Clean up test output directory before each test
			if (fs.existsSync(testOutputDir)) {
				fs.rmSync(testOutputDir, { recursive: true });
			}
			fs.mkdirSync(testOutputDir);
		});

		afterAll(() => {
			// Clean up test output directory after all tests
			if (fs.existsSync(testOutputDir)) {
				fs.rmSync(testOutputDir, { recursive: true });
			}
		});

		it("should generate all required files", () => {
			generateServerFiles(schema, testOutputDir);

			// Check if all required files are generated
			expect(fs.existsSync(path.join(testOutputDir, "tools.ts"))).toBe(true);
			expect(fs.existsSync(path.join(testOutputDir, "index.ts"))).toBe(true);
			expect(fs.existsSync(path.join(testOutputDir, "package.json"))).toBe(
				true,
			);
			expect(fs.existsSync(path.join(testOutputDir, "tsconfig.json"))).toBe(
				true,
			);
			expect(fs.existsSync(path.join(testOutputDir, "utils"))).toBe(true);
		});

		it("should generate valid TypeScript files", () => {
			generateServerFiles(schema, testOutputDir);

			// Read and verify the content of generated files
			const toolsContent = fs.readFileSync(
				path.join(testOutputDir, "tools.ts"),
				"utf-8",
			);
			const indexContent = fs.readFileSync(
				path.join(testOutputDir, "index.ts"),
				"utf-8",
			);

			// Check for required imports and structure
			expect(toolsContent).toContain("import { McpServer }");
			expect(toolsContent).toContain("export function registerTools");
			expect(indexContent).toContain("import { McpServer }");
			expect(indexContent).toContain("export async function main");
		});

		it("should copy utility files", () => {
			generateServerFiles(schema, testOutputDir);

			// Check if utility files are copied
			expect(
				fs.existsSync(path.join(testOutputDir, "utils/graphql-client.ts")),
			).toBe(true);
			expect(fs.existsSync(path.join(testOutputDir, "utils/index.d.ts"))).toBe(
				true,
			);
		});

		it("should handle environment variables", () => {
			// Create a test .env file
			const testEnvPath = path.join(process.cwd(), ".env");
			fs.writeFileSync(testEnvPath, "TEST_VAR=test_value");

			generateServerFiles(schema, testOutputDir);

			// Check if .env file is copied
			expect(fs.existsSync(path.join(testOutputDir, ".env"))).toBe(true);

			// Clean up test .env file
			fs.unlinkSync(testEnvPath);
		});
	});
});
