export interface CustomTypeProcessor {
	isSpecialField: (typeName: string | undefined) => boolean;
	processSpecialFields: (
		fields: Record<string, unknown>,
	) => Record<string, unknown>;
}

export const CustomTypeProcessor = [
	// {
	//   isSpecialField: (typeName: string | undefined) => {
	//     return typeName && typeName.endsWith("xyz");
	//   },
	//   processSpecialFields: (fields: Record<string, any>) => {
	//     const fieldEntriesToProcess = Object.entries(fields).filter(
	//       ([fieldName, _field]) =>
	//         fieldName === "abc" || fieldName === "def"
	//     );
	//     return Object.fromEntries(fieldEntriesToProcess);
	//   },
	// },
] as CustomTypeProcessor[];
