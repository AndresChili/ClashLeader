// Shared flat ESLint config for the plain TypeScript workspaces
// (packages/rules, apps/collector). apps/web keeps its own Next.js config.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  },
);
