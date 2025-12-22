import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.ts is now available by default in Next.js 16
  // No experimental flags needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
