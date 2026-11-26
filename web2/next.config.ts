import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.26.27.79"],
  // public/docs holds ~1 GB of generated Lean docs served as static files.
  // No server route reads them, so keep them out of every function bundle:
  // pulling them in pushes a function past Vercel's 250 MB limit and the
  // whole deploy fails.
  outputFileTracingExcludes: {
    "*": ["public/docs/**/*"],
  },
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
