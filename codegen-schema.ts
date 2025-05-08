import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
	overwrite: true,
	schema: "in/schema.json",
	generates: {
		"out/schema.ts": {
			plugins: ["typescript", "typescript-validation-schema"],
			config: {
				strictScalars: true,
				scalars: {
					ID: "string",
					Color: "string",
					DateTime: "string",
					Decimal: "number",
					HTML: "string",
					ISO8601DateTime: "string",
					JSON: "Record<string, any>",
					URL: "string",
					UnsignedInt64: "string",
				},
				schema: "zod",
			},
		},
	},
};

export default config;
