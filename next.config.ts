import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    // During development, proxy client requests under /proxy/* to the remote API
    // This avoids CORS while keeping no /api app routes.
    if (process.env.NODE_ENV === 'development') {
      const target = process.env.NEXT_PUBLIC_API_URL || 'https://telemedicina-api-774w.onrender.com';
      return [
        {
          source: '/proxy/:path*',
          destination: `${target}/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
