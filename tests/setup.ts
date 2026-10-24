import { vi } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

/** `server-only` throws outside the Next server graph; no-op in unit tests. */
vi.mock("server-only", () => ({}));
