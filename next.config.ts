import type { NextConfig } from 'next'

const selfHosted = !process.env.VERCEL
const isProduction = process.env.NODE_ENV === 'production'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  // HSTS pins the whole host regardless of port, so a dev server on https://localhost would force HTTPS on
  // every local app. No includeSubDomains: on an apex domain it would also cover unrelated subdomains.
  ...(isProduction ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }] : []),
]

// Vercel traces the build itself, and `output: 'standalone'` breaks its build step.
const standaloneConfig: NextConfig = selfHosted
  ? {
      output: 'standalone',
      // Turbopack's trace misses @swc/helpers under pnpm's symlinked store.
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
