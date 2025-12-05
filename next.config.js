/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  allowedDevOrigins: [
    'localhost:5000',
    '*.replit.dev',
    '*.janeway.replit.dev',
    '*.repl.co',
  ],
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
