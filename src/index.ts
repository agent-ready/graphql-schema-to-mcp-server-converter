import { buildSchema } from "graphql";
import { generateServerFiles } from "./generator/index.js";
import {
	getDefaultSchemaPath,
	loadSchemaContent,
} from "./utils/schema-loader.js";

async function main() {
	try {
		// Load the schema content
		const schemaPath = getDefaultSchemaPath();
		const schemaString = await loadSchemaContent(schemaPath);

		// Parse the schema
		const schema = buildSchema(schemaString);

		// Generate server files
		generateServerFiles(schema);

		console.log("Server files generated successfully in the 'out' directory");
	} catch (error) {
		console.error("Error processing schema:", error);
		process.exit(1);
	}
}

main();
