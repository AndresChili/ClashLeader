// Config plana de ESLint compartida para los workspaces de TypeScript
// simple (packages/rules, apps/collector). apps/web mantiene su propia
// config de Next.js.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  },
);
