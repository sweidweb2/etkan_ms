import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/absolute-url";

/**
 * Crawl policy for search + AI bots.
 * Private panels, auth, invites, and admin-gated /life stay disallowed.
 * AI crawlers inherit the same allow/disallow paths (explicit allow for GEO).
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/admin",
    "/manager",
    "/co-manager",
    "/ceo",
    "/supervisor",
    "/crm",
    "/teacher",
    "/student",
    "/auth",
    "/f/",
    "/register/guest",
    "/life",
    "/api",
    "/maintenance",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow,
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow,
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow,
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow,
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow,
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
