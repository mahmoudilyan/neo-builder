import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Allow importing the repo's /docs markdown (outside this app's root).
  server: { port: 5174, fs: { allow: [repoRoot] } },
});
