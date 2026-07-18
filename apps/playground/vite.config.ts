import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@neo-builder/core": pkg("core"),
      "@neo-builder/theme": pkg("theme"),
      "@neo-builder/elements": pkg("elements"),
      "@neo-builder/compiler-html": pkg("compiler-html"),
      "@neo-builder/compiler-mjml": pkg("compiler-mjml"),
      "@neo-builder/compiler-form": pkg("compiler-form"),
      "@neo-builder/editor-react/styles.css": fileURLToPath(
        new URL("../../packages/editor-react/src/styles.css", import.meta.url),
      ),
      "@neo-builder/editor-react": pkg("editor-react"),
      "@neo-builder/editor-tiptap": pkg("editor-tiptap"),
      "@neo-builder/recipes": pkg("recipes"),
      "@neo-builder/ai": pkg("ai"),
    },
  },
  server: { port: 5173 },
});
