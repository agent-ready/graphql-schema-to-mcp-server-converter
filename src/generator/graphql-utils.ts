import {
	GraphQLEnumType,
	type GraphQLField,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	type GraphQLType,
} from "graphql";
import { CONFIG } from "./config.js";
import type { InputSchemaResult } from "./types.js";

export function isMutationField(
	field: GraphQLField<unknown, unknown>,
): boolean {
	const parentType = field.astNode?.type;
	if (
		parentType &&
		"name" in parentType &&
		parentType.name?.value === "Mutation"
	)
		return true;

	return (
		field.name.toLowerCase().startsWith("create") ||
		field.name.toLowerCase().startsWith("update") ||
		field.name.toLowerCase().startsWith("delete")
	);
}

export function isOperationField(
	field: GraphQLField<unknown, unknown>,
): boolean {
	if (field.args.length === 0) return false;
	if (isMutationField(field)) return true;
	return true;
}

export function isListType(type: GraphQLType): boolean {
	if (type instanceof GraphQLNonNull) {
		return isListType(type.ofType);
	}
	return type instanceof GraphQLList;
}

export function generateResponseFields(type: GraphQLType, depth = 0): string {
	if (depth > CONFIG.MAX_RESPONSE_DEPTH) {
		return "";
	}

	if (type instanceof GraphQLNonNull) {
		return generateResponseFields(type.ofType, depth);
	}

	if (type instanceof GraphQLList) {
		return generateResponseFields(type.ofType, depth);
	}

	if (type instanceof GraphQLObjectType) {
		const fields = type.getFields();
		let fieldEntriesToProcess = Object.entries(fields);
		if (type.name) {
			const customProcessor = CONFIG.CUSTOM_TYPE_PROCESSORS.find((processor) =>
				processor.isSpecialField(type.name),
			);
			if (customProcessor) {
				fieldEntriesToProcess = Object.entries(
					customProcessor.processSpecialFields(fields),
				);
			}
		}
		return fieldEntriesToProcess
			.map(([fieldName, field]) => {
				let unwrappedFieldType = field.type;
				if (unwrappedFieldType instanceof GraphQLNonNull) {
					unwrappedFieldType = unwrappedFieldType.ofType;
				}

				if (unwrappedFieldType instanceof GraphQLObjectType) {
					const subFieldsString = generateResponseFields(field.type, depth + 1);
					if (subFieldsString.trim() === "") {
						return "";
					}
					return `${fieldName} { ${subFieldsString} }`;
				}
				if (unwrappedFieldType instanceof GraphQLList) {
					let listElementType = unwrappedFieldType.ofType;
					if (listElementType instanceof GraphQLNonNull) {
						listElementType = listElementType.ofType;
					}
					if (listElementType instanceof GraphQLObjectType) {
						const subFieldsString = generateResponseFields(
							field.type,
							depth + 1,
						);
						if (subFieldsString.trim() === "") {
							return "";
						}
						return `${fieldName} { ${subFieldsString} }`;
					}
					return fieldName;
				}
				return fieldName;
			})
			.filter((name) => name && name.trim() !== "")
			.join("\n");
	}

	return "";
}

export function generateInputSchema(
	field: GraphQLField<unknown, unknown>,
): InputSchemaResult {
	const schemaShape: Record<string, string> = {};
	const typeMap: Record<string, string> = {};

	if (isMutationField(field)) {
		const inputArg = field.args.find((arg) => arg.name === "input");
		if (inputArg) {
			const typeName = inputArg.type.toString().replace(/[\[\]!]/g, "");
			schemaShape.input = `Schema.${typeName}Schema()`;
			typeMap.input = `Schema.${typeName}`;
		}
	}

	for (const arg of field.args) {
		const typeName = arg.type.toString().replace(/[\[\]!]/g, "");
		const isArray = isListType(arg.type);
		const isRequired = arg.type instanceof GraphQLNonNull;

		let gqlType = arg.type;
		while (
			gqlType instanceof GraphQLNonNull ||
			gqlType instanceof GraphQLList
		) {
			gqlType = gqlType.ofType;
		}

		const makeOptional = (typeStr: string) =>
			isRequired ? typeStr : `${typeStr}.optional()`;

		if (typeName === "ID" || typeName === "String" || typeName === "URL") {
			schemaShape[arg.name] = makeOptional(
				isArray ? "z.array(z.string())" : "z.string()",
			);
			typeMap[arg.name] = "string";
		} else if (typeName === "Int") {
			schemaShape[arg.name] = makeOptional(
				isArray ? "z.array(z.number().int())" : "z.number().int()",
			);
			typeMap[arg.name] = "number";
		} else if (typeName === "Boolean") {
			schemaShape[arg.name] = makeOptional(
				isArray ? "z.array(z.boolean())" : "z.boolean()",
			);
			typeMap[arg.name] = "boolean";
		} else if (typeName === "Float") {
			schemaShape[arg.name] = makeOptional(
				isArray ? "z.array(z.number())" : "z.number()",
			);
			typeMap[arg.name] = "number";
		} else if (gqlType instanceof GraphQLEnumType) {
			schemaShape[arg.name] = makeOptional(
				isArray
					? `z.array(z.nativeEnum(${typeName}))`
					: `z.nativeEnum(${typeName})`,
			);
			typeMap[arg.name] = `${typeName}`;
		} else {
			schemaShape[arg.name] = makeOptional(
				isArray
					? `z.array(Schema.${typeName}Schema())`
					: `Schema.${typeName}Schema()`,
			);
			typeMap[arg.name] = `Schema.${typeName}`;
		}
	}

	return { schema: schemaShape, types: typeMap };
}

export function generateGraphQLOperation(
	field: GraphQLField<unknown, unknown>,
	typeName: string,
): string {
	const isMutation = typeName === "Mutation";
	const operationType = isMutation ? "mutation" : "query";
	const operationName =
		field.name.charAt(0).toUpperCase() + field.name.slice(1);

	if (isMutation) {
		const inputArg = field.args.find((arg) => arg.name === "input");
		if (inputArg) {
			return `
        ${operationType} ${operationName}($input: ${inputArg.type}) {
          ${field.name}(input: $input) {
            ${generateResponseFields(field.type)}
          }
        }
      `;
		}
	}

	return `
    ${operationType} ${operationName}(${field.args
			.map((arg) => `$${arg.name}: ${arg.type}`)
			.join(", ")}) {
      ${field.name}(${field.args
				.map((arg) => `${arg.name}: $${arg.name}`)
				.join(", ")}) {
        ${generateResponseFields(field.type)}
      }
    }
  `;
}
