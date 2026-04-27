import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable React StrictMode to prevent double rendering in development
  reactStrictMode: false,
  // Standalone output para Docker — gera build autocontido e leve (~100MB)
  output: 'standalone',
  async rewrites() {
    // Proxy /api/* para a API backend (Cloud Run ou localhost)
    const target = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
