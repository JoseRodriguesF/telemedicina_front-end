import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable the React Compiler for optimized rendering
  reactCompiler: true,
  async rewrites() {
    // During development or production, proxy client requests under /api/* to the remote API
    // EXCEPT for local routes like /api/upload
    const target = (process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com').replace(/\/$/, '');

    return [
      {
        // This regex ensures we don't proxy /api/upload but proxy everything else under /api
        source: '/api/:path((?!upload).*)',
        destination: `${target}/:path`,
      },
    ];
  },
};

export default nextConfig;
