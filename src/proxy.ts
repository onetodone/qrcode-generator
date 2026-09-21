import { after, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { logRequest } from '@/lib/logger'
import { clientIpFromHeaders } from '@/lib/request'

const publicOnlyRoutes = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password']

const isDev = process.env.NODE_ENV !== 'production'
const cspConnectSrcExtra = process.env.CSP_CONNECT_SRC_EXTRA?.trim() ?? ''

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${cspConnectSrcExtra ? ` ${cspConnectSrcExtra}` : ''}${isDev ? ' ws:' : ''}`,
    "worker-src 'self' blob:",
  ].join('; ')
}

export default auth((req) => {
  const start = performance.now()
  const { nextUrl } = req
  const isLoggedIn = Boolean(req.auth)
  const isPublicOnlyRoute = publicOnlyRoutes.some((route) => nextUrl.pathname.startsWith(route))

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  let response: NextResponse
  if (!isLoggedIn && !isPublicOnlyRoute) {
    response = NextResponse.redirect(new URL('/login', nextUrl))
  } else if (isLoggedIn && isPublicOnlyRoute) {
    response = NextResponse.redirect(new URL('/', nextUrl))
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } })
  }
  response.headers.set('Content-Security-Policy', csp)

  after(() => {
    logRequest({
      method: req.method,
      path: nextUrl.pathname + nextUrl.search,
      ip: clientIpFromHeaders(req.headers),
      userId: req.auth?.user?.id ?? null,
      status: response.status,
      durationMs: performance.now() - start,
    })
  })

  return response
})

export const config = {
  // Skip the public /s/[hash] redirect route, the auth API, static assets, and
  // the metadata file-convention routes (favicon/icon/apple-icon/manifest/OG
  // image/sitemap/robots) — these must stay reachable pre-login for browsers,
  // PWA installers, link-preview crawlers, search-engine crawlers (sitemap.xml,
  // robots.txt — they never have a session), and (for logo.png) email clients
  // rendering the verification email's logo for a not-yet-logged-in recipient.
  matcher: [
    '/((?!api|s/|_next/static|_next/image|favicon\\.ico|icon\\.(?:svg|png)|apple-icon\\.png|opengraph-image\\.jpg|manifest\\.json|sitemap\\.xml|robots\\.txt|web-app-manifest-.*\\.png|logo\\.png).*)',
  ],
}
