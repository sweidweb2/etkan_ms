import type { NextConfig } from "next";

/** ISR marketing HTML — align with `app/(public)/layout` revalidate=600. */
const PUBLIC_MARKETING_CACHE_CONTROL =
  "public, s-maxage=600, stale-while-revalidate=86400";

const nextConfig: NextConfig = {
  output: "standalone",
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
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    const marketingPaths = [
      "/",
      "/about",
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
    // Public marketing pages are static — keep their UI in the client router
    // cache so back/forward and repeat visits feel instant. Dynamic routes
    // (auth/panels) stay at 0 so they always refetch.
    staleTimes: {
      dynamic: 0,
      static: 300,
    },
    // Default is 1mb; workshop documents allow 10mb plus multipart overhead.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
