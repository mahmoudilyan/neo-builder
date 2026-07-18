import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const pkg = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@neo-builder/core": pkg("core"),
      "@neo-builder/theme": pkg("theme"),
      "@neo-builder/elements": pkg("elements"),
      "@neo-builder/compiler-html": pkg("compiler-html"),
      "@neo-builder/compiler-mjml": pkg("compiler-mjml"),
      "@neo-builder/compiler-form": pkg("compiler-form"),
      "@neo-builder/ai": pkg("ai"),
      "@neo-builder/mcp": pkg("mcp"),
    },
  },
  test: {
    include: ["packages/*/src/**/*.test.ts"],
  },
});
