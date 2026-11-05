import type { NextConfig } from "next";

/** ISR marketing HTML — align with `app/(public)/layout` revalidate=600. */
const PUBLIC_MARKETING_CACHE_CONTROL =
  "public, s-maxage=600, stale-while-revalidate=86400";

const nextConfig: NextConfig = {
  output: "standalone",
  // Project guidance lives in `.cursor/rules` — skip Next's auto AGENTS.md.
  agentRules: false,
  // Playwright / Docker often hit http://127.0.0.1:3000 while `next dev`
  // advertises localhost — without this, Next blocks /_next/* and client
  // components never hydrate (login E2E hangs on data-hydrated).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "media.istockphoto.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "api.etkan.org",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "prod-api.etkan.org",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    const marketingPaths = [
      "/",
      "/about",
      "/blogs",
      "/blogs/:path*",
      "/careers",
      "/careers/:path*",
      "/gallery",
      "/projects",
      "/register",
      "/maintenance",
    ];

    return marketingPaths.map((source) => ({
      source,
      headers: [
        {
          key: "Cache-Control",
          value: PUBLIC_MARKETING_CACHE_CONTROL,
        },
      ],
    }));
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 300,
    },
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
