import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options',        value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js 필수
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://lh3.googleusercontent.com",
      "font-src 'self'",
      "connect-src 'self' https://api.binance.com https://api.portone.io https://api.iamport.kr",
      "frame-src https://*.tosspayments.com https://portone.io https://*.portone.io",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const BLOG_URL = 'https://frontier0553-nxiyd.wordpress.com';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async redirects() {
    return [
      // bemialert.com/blog → WordPress 블로그
      { source: '/blog', destination: BLOG_URL, permanent: false },
      { source: '/blog/:path*', destination: `${BLOG_URL}/:path*`, permanent: false },
    ];
  },
};

export default nextConfig;