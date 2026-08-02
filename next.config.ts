import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
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
