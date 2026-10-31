import type { FullConfig } from "@playwright/test";

/**
 * Warm critical routes so the first cold Turbopack compile does not flake
 * Phase 1–2 specs on local `npm run dev` / Docker Next.
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL ??
    process.env.E2E_BASE_URL ??
    "http://127.0.0.1:3000";

  const paths = ["/", "/auth/login", "/about", "/register"];
  for (const path of paths) {
    try {
      const response = await fetch(new URL(path, baseURL), {
        signal: AbortSignal.timeout(90_000),
      });
      // eslint-disable-next-line no-console
      console.log(`[e2e warm] ${path} → ${response.status}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[e2e warm] ${path} failed: ${String(error)}`);
    }
  }
}

export default globalSetup;
