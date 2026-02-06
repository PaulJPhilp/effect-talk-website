import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Set workspace root to current project directory to avoid lockfile detection warnings
    root: process.cwd(),
  },
};

export default nextConfig;
