import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.26.27.79"],
  async redirects() {
    return [
      {
        source: '/wiki/:path*',
        destination: '/api-maps/:path*',
        permanent: true,
      },
      {
        source: '/api-tracker',
        destination: '/api-maps',
        permanent: true,
      },
      {
        source: '/api-tracker/new',
        destination: '/api-maps/new',
        permanent: true,
      },
      {
        source: '/docs',
        destination: '/docs/index.html',
        permanent: true,
      },
      {
        source: '/GettingStarted',
        destination: '/getting-started',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
