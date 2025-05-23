const fs = require("node:fs");
const path = require("node:path");

const filePath = path.join(__dirname, "../out/schema.ts");

const content = fs.readFileSync(filePath, "utf8");

// Here, you can add custom logic such as

// content = content.replace(
//   /DeliveryAddressValidationStrategySchema\.default\("COUNTRY_CODE_ONLY"\)/g,
//   "DeliveryAddressValidationStrategySchema.default(DeliveryAddressValidationStrategy.CountryCodeOnly)"
// );

// fs.writeFileSync(filePath, content, "utf8");

// console.log("Post-processed schema.ts");
