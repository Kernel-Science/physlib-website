import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.26.27.79"],
  async redirects() {
    return [
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
