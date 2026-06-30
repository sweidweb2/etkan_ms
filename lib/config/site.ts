import { ROUTES } from "@/lib/constants/routes";

export const SITE = {
  name: "Ashlilie",
  description: "Personal portfolio",
  tagline: "Design, development, and creative work.",
} as const;

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Public app origin (no path). Set per environment via NEXT_PUBLIC_SITE_URL.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Example (dev): http://localhost:3000"
    );
  }

  return trimTrailingSlash(url);
}

/**
 * Full OAuth / magic-link callback URL. Must match Supabase Redirect URLs and ROUTES.CALLBACK.
 */
export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}${ROUTES.CALLBACK}`;
}
