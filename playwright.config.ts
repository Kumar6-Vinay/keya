import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 5183);

/** Browser tests at phone size. Speech is replaced by a recording fake (e2e/fixtures.ts), so they need no voices or sound. */
export default defineConfig({
  testDir: "e2e",
  outputDir: "node_modules/.e2e-results",
  reporter: "list",
  timeout: 60_000,
  workers: 1,
  use: { ...devices["Pixel 7"], baseURL: `http://localhost:${port}` },
  webServer: { command: `npx vite --port ${port} --strictPort`, url: `http://localhost:${port}`, reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
