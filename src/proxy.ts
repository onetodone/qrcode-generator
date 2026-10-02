import { after, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { logRequest } from '@/lib/logger'
import { setHandoffCookie } from '@/lib/handoff-cookies'
import { clientIpFromHeaders } from '@/lib/request'

const publicOnlyRoutes = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password']
// Open to guests and signed-in users alike; matched exactly.
const publicRoutes = ['/', '/link-disabled', '/confirm-email', '/terms-of-use', '/privacy-policy', '/account-deleted']

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
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const resetToken = nextUrl.pathname === '/reset-password' ? nextUrl.searchParams.get('token') : null

  let response: NextResponse
  if (!isLoggedIn && !isPublicOnlyRoute && !isPublicRoute) {
    response = NextResponse.redirect(new URL('/login', nextUrl))
  } else if (isLoggedIn && isPublicOnlyRoute) {
    response = NextResponse.redirect(new URL('/qrcodes', nextUrl))
  } else if (resetToken) {
    response = NextResponse.redirect(new URL('/reset-password', nextUrl))
    setHandoffCookie(response, 'resetToken', resetToken, req.headers)
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
  // Paths that must work without a session: the /s/[hash] redirect, the auth
  // API, static assets, metadata files (icons, manifest, OG image, sitemap,
  // robots) for browsers and crawlers, and logo.png for email clients.
  matcher: [
    '/((?!api|s/|_next/static|_next/image|favicon\\.ico|icon\\.(?:svg|png)|apple-icon\\.png|opengraph-image\\.jpg|manifest\\.json|sitemap\\.xml|robots\\.txt|web-app-manifest-.*\\.png|logo\\.png).*)',
  ],
}
