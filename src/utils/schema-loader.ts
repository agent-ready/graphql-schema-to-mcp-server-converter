import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { type GraphQLSchema, buildClientSchema, printSchema } from "graphql";

// Get the directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads schema content from a file, handling decompression if needed
 * @param {string} schemaPath - Path to the schema file
 * @returns {Promise<string>} The schema content as a string
 */
export async function loadSchemaContent(schemaPath: string): Promise<string> {
	const gzippedSchemaPath = `${schemaPath}.gz`;

	// If uncompressed file doesn't exist but gzipped does, decompress it
	if (!existsSync(schemaPath) && existsSync(gzippedSchemaPath)) {
		console.log(`Decompressing schema from ${gzippedSchemaPath}`);
		const compressedData = await fs.readFile(gzippedSchemaPath);
		const schemaContent = zlib.gunzipSync(compressedData).toString("utf-8");

		// Save the uncompressed content to disk
		await fs.writeFile(schemaPath, schemaContent, "utf-8");
		console.log(`Saved uncompressed schema to ${schemaPath}`);

		// Parse JSON and convert to SDL
		const jsonSchema = JSON.parse(schemaContent);
		const clientSchema: GraphQLSchema = buildClientSchema(jsonSchema.data);
		return printSchema(clientSchema);
	}

	console.log(`Reading schema from ${schemaPath}`);
	const content = await fs.readFile(schemaPath, "utf8");

	// Parse JSON and convert to SDL
	const jsonSchema = JSON.parse(content);
	const clientSchema: GraphQLSchema = buildClientSchema(jsonSchema.data);
	return printSchema(clientSchema);
}

/**
 * Gets the default schema path
 * @returns {string} The path to the default schema file
 */
export function getDefaultSchemaPath(): string {
	return path.join(__dirname, "..", "..", "in", "schema.json");
}
