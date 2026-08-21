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
    ]
  },
};

export default nextConfig;
