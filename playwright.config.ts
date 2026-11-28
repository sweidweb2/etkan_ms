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
 *
 * No E2E in CI for now — local-first. Mutations stay serial (shared DB).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const skipWebServer = process.env.E2E_SKIP_WEBSERVER === "1";
const isCi = !!process.env.CI;
const localWorkers = Number(process.env.E2E_WORKERS ?? 3);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCi,
  // Local: fail once (false waits must not double). CI pattern kept if E2E returns later.
  retries: isCi ? 1 : 0,
  workers: isCi ? 1 : localWorkers,
  reporter: isCi ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      fullyParallel: false,
      workers: 1,
    },
    {
      name: "public",
      testMatch: /e2e[\\/]public[\\/].*\.spec\.ts/,
      fullyParallel: true,
      workers: isCi ? 1 : localWorkers,
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
      // Read-only manager route matrix — safe to parallelize.
      name: "manager-smoke",
      dependencies: ["setup"],
      testMatch: /e2e[\\/]manager[\\/]smoke-nav\.spec\.ts/,
      fullyParallel: true,
      workers: isCi ? 1 : localWorkers,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Mutations + deep paths share local DB — keep serial.
      name: "manager",
      dependencies: ["setup"],
      testMatch: /e2e[\\/]manager[\\/].*\.spec\.ts/,
      testIgnore: /smoke-nav\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "panels",
      dependencies: ["setup"],
      testMatch: /e2e[\\/](teacher|student|staff)[\\/].*\.spec\.ts/,
      fullyParallel: true,
      workers: isCi ? 1 : Math.min(2, localWorkers),
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !isCi,
        timeout: 180_000,
      },
});
