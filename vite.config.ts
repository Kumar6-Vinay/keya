import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build` makes the installable app (with offline service worker).
// `npm run build:preview` makes one self-contained HTML file for sharing a preview.
export default defineConfig(({ mode }) => ({
  plugins: mode === "single" ? [preact(), viteSingleFile()] : [preact()],
  build: mode === "single" ? { outDir: "dist-preview", copyPublicDir: false } : { outDir: "dist" },
  test: { globals: true, environment: "node", include: ["tests/**/*.test.ts"] },
}));
