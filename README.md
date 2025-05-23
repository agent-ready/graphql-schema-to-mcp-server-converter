# GraphQL Schema to MCP Converter

This is a simple tool that converts a GraphQL schema to a MCP Server.

So far, we are expecting a graphql schema json representation.

## Setup

```
cp .env.example .env
cp -r in.example in
cp -r scripts.example scripts
cp src/generator/custom-type-processor.example.ts src/generator/custom-type-processor.ts
mkdir out
pnpm i
```

Replace in/schema.json with your GraphQL schema.
Replace envvars in .env with your values.

`scripts/post-process-schema.cjs` can be used to post-process the generated schema file.
`src/generator/custom-type-processor.ts` can be used to process special fields, that you may want to skip or process differently.

## Running

```
pnpm gen
```

will generate the MCP Server in the `out` folder.

## Testing the MCP Server

```
cd out
pnpm i
pnpm build
npx @modelcontextprotocol/inspector node dist/index.js
```

will spin up MCP inspector, so you can test the generated MCP Server manually.
