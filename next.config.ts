import type { NextConfig } from 'next'

const selfHosted = !process.env.VERCEL

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
]

const standaloneConfig: NextConfig = selfHosted
  ? {
      output: 'standalone',
      outputFileTracingIncludes: {
        '/**/*': ['./node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**/*'],
      },
    }
  : {}

const nextConfig: NextConfig = {
  ...standaloneConfig,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
