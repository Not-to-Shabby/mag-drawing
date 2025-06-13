import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // Enhanced security configuration
  serverExternalPackages: ['bcryptjs'],
  
  // Optimize for security and performance
  poweredByHeader: false,
  compress: true,
  
  // Enhanced security headers
  async headers() {
    const securityHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=(), vibrate=(), fullscreen=(self)',
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'off',
      },
      {
        key: 'X-Download-Options',
        value: 'noopen',
      },
      {
        key: 'X-Permitted-Cross-Domain-Policies',
        value: 'none',
      },
    ];

    // Add HSTS only in production
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/api/(.*)',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
  
  // Redirect configuration for security
  async redirects() {
    return [
      // Redirect common attack vectors
      {
        source: '/wp-admin/:path*',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/wordpress/:path*',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/phpmyadmin/:path*',
        destination: '/404',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
