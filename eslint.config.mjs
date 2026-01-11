import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local Python virtualenvs (can be huge; not part of Next.js code)
    ".venv-tools/**",
    ".venv/**",
    "rag_system/venv/**",
    "**/venv/**",
  ]),
  // Keep linting useful, but don't block the project on legacy UI files.
  // (This repo includes many older pages with `any` and unescaped quotes.)
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "warn",
      "prefer-const": "off",
    },
  },
]);

export default eslintConfig;
