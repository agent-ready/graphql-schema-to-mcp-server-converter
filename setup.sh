cp .env.example .env
cp -r in.example in
cp -r scripts.example scripts
cp src/generator/custom-type-processor.example.ts src/generator/custom-type-processor.ts
mkdir out
pnpm i