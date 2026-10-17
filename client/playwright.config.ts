import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. Start the API (server: npm run dev) on a freshly seeded
 * database first (server: npm run db:reset). Vite is started automatically.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true },
});
