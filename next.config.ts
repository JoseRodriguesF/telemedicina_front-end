import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable React StrictMode to prevent double rendering in development
  reactStrictMode: false,
  async rewrites() {
    // During development or production, proxy client requests under /api/* to the remote API
    const target = (process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com').replace(/\/$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
