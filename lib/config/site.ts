import { ROUTES } from "@/lib/constants/routes";

export const SITE = {
  /** Public / marketing brand (home, auth, SEO). */
  name: "Etkan",
  /** Management System brand for role panels and internal tooling. */
  systemName: "Etkan MS",
  description: "School management system",
  tagline: "Administration and student management.",
} as const;

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalhostOrigin(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

function originFromHost(host: string | undefined): string | null {
  if (!host) return null;
  const trimmed = trimTrailingSlash(host);
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Public app origin (no path).
 * Prefer a real configured URL; never keep a baked-in localhost origin on deploy.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const runtimeOrigin =
    originFromHost(process.env.SITE_URL) ??
    originFromHost(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    originFromHost(process.env.VERCEL_URL);

  if (configured && !isLocalhostOrigin(configured)) {
    return trimTrailingSlash(configured);
  }

  if (runtimeOrigin) {
    return runtimeOrigin;
  }

  if (configured) {
    return trimTrailingSlash(configured);
  }

  throw new Error(
    "NEXT_PUBLIC_SITE_URL is not set. Example (dev): http://localhost:3000"
  );
}

/**
 * Full OAuth / magic-link callback URL. Must match Supabase Redirect URLs and ROUTES.CALLBACK.
 */
export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}${ROUTES.CALLBACK}`;
}
