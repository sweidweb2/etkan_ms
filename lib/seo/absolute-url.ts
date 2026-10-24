import { getSiteUrl } from "@/lib/config/site";

/** Absolute public URL for a path (canonical, sitemap, JSON-LD). */
export function absoluteUrl(path: string = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") {
    return base;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
