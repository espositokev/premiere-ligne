import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// Facultatif : utiliser un Chrome déjà installé (PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome).
// En CI, le navigateur de Playwright est installé par `playwright install`.
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"] } },
    // §13 : tester aussi en viewport mobile (iPhone 13), avec le moteur Chromium.
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
