import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
  {
    // Keep files small and single-purpose: split a file before it grows past this.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: false, skipComments: false }],
    },
  },
]);

export default eslintConfig;
