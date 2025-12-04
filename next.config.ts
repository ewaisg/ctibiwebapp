import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['handlebars'],
  turbopack: {
    // Empty config to silence Turbopack warning
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only packages for the client
      config.resolve.alias = {
        ...config.resolve.alias,
        handlebars: false,
        canvas: false,
        jsdom: false,
      };

      // Ignore node modules that are not needed on client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        jsdom: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
    ];
  },
  /* other config options here */
};

export default nextConfig;
