import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/profile/:tab", destination: "/profile" },
      { source: "/jobs/:id", destination: "/jobs" },
      { source: "/resume/:id", destination: "/resume" },
      { source: "/cover-letter/:id", destination: "/cover-letter" },
    ];
  },
};

export default nextConfig;
