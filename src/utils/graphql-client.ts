/**
 * GraphQL client utility using the Fetch API
 */

interface GraphQLResponse<T = unknown> {
	data?: T;
	errors?: Array<{
		message: string;
		locations?: Array<{
			line: number;
			column: number;
		}>;
		path?: string[];
		extensions?: Record<string, unknown>;
	}>;
}

/**
 * Makes a GraphQL request to the specified endpoint
 * @param {string} endpoint - The GraphQL API endpoint URL
 * @param {string} query - The GraphQL query or mutation
 * @param {Object} variables - Optional variables for the query/mutation
 * @param {Object} headers - Optional additional headers
 * @returns {Promise<T>} The response data
 */
export async function graphqlRequest<T = unknown>(
	endpoint: string,
	query: string,
	variables: Record<string, unknown> = {},
	headers: Record<string, string> = {},
): Promise<T> {
	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...headers,
			},
			body: JSON.stringify({
				query,
				variables,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = (await response.json()) as GraphQLResponse<T>;

		if (result.errors) {
			throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
		}

		return result.data as T;
	} catch (error) {
		console.error("GraphQL request failed:", error);
		throw error;
	}
}

/**
 * Makes a GraphQL query
 * @param {string} endpoint - The GraphQL API endpoint URL
 * @param {string} query - The GraphQL query
 * @param {Object} variables - Optional variables for the query
 * @param {Object} headers - Optional additional headers
 * @returns {Promise<T>} The response data
 */
export async function query<T = unknown>(
	endpoint: string,
	query: string,
	variables: Record<string, unknown> = {},
	headers: Record<string, string> = {},
): Promise<T> {
	return graphqlRequest<T>(endpoint, query, variables, headers);
}

/**
 * Makes a GraphQL mutation
 * @param {string} endpoint - The GraphQL API endpoint URL
 * @param {string} mutation - The GraphQL mutation
 * @param {Object} variables - Optional variables for the mutation
 * @param {Object} headers - Optional additional headers
 * @returns {Promise<T>} The response data
 */
export async function mutation<T = unknown>(
	endpoint: string,
	mutation: string,
	variables: Record<string, unknown> = {},
	headers: Record<string, string> = {},
): Promise<T> {
	return graphqlRequest<T>(endpoint, mutation, variables, headers);
}
