import { defineConfig, devices } from "@playwright/test";
import { loadLocalEnv } from "./e2e/fixtures/env";

loadLocalEnv();

/**
 * E2E runs on the host by default and hits whatever serves the app on
 * E2E_BASE_URL (host `npm run dev`, or a Docker-mapped Next container).
 *
 * Docker notes:
 * - Local Supabase is already Docker (`npx supabase start`). Keep it up.
 * - If Next is `npm run dev` on the host → default URL works.
 * - If Next is `etkan-local-web` (compose.local) → same URL; set
 *   E2E_SKIP_WEBSERVER=1 so Playwright does not spawn a second server.
 * - If Playwright itself runs inside a container against host Next, use
 *   E2E_BASE_URL=http://host.docker.internal:3000
 *
 * Maintenance mode must stay **off** in the E2E env (auth tests need login).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const skipWebServer = process.env.E2E_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  workers: process.env.CI ? 1 : 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      fullyParallel: false,
      workers: 1,
    },
    {
      // Public Phase 0–2: no auth dependency (survives seed/setup issues).
      name: "public",
      testMatch: /e2e[\\/]public[\\/].*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "auth",
      dependencies: ["setup"],
      testMatch: /e2e[\\/]auth[\\/].*\.spec\.ts/,
      testIgnore: /auth\.setup\.ts/,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Phase 3–4 manager panel (requires manager storageState from setup).
      name: "manager",
      dependencies: ["setup"],
      testMatch: /e2e[\\/]manager[\\/].*\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
