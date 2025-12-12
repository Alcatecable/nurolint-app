/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Allow all hosts for Replit proxy
  async rewrites() {
    return [];
  },
  
  webpack: (config, { dev, isServer }) => {
    // Only add SVG rule if @svgr/webpack is actually installed
    // config.module.rules.push({
    //   test: /\.svg$/,
    //   use: ['@svgr/webpack']
    // });
    
    // Handle WebSocket optional dependencies (server-side only)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'bufferutil': 'bufferutil',
        'utf-8-validate': 'utf-8-validate'
      });
    }
    
    return config;
  },
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        // Only add HSTS in production
        ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }])
      ]
    }];
  },
  // Override default hostname checking for Replit
  experimental: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : [])
    ]
  },
  // Allow dev origins for Replit proxy - use exact domain
  allowedDevOrigins: process.env.REPLIT_DEV_DOMAIN ? [
    `https://${process.env.REPLIT_DEV_DOMAIN}`,
    'https://*.picard.replit.dev',
    'https://*.id.replit.app'
  ] : [
    'https://*.picard.replit.dev', 
    'https://*.id.replit.app'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  }
};

module.exports = nextConfig;
