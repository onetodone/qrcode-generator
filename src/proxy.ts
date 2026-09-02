import { after, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { logRequest } from '@/lib/logger'
import { clientIpFromHeaders } from '@/lib/request'

const publicOnlyRoutes = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password']

export default auth((req) => {
  const start = performance.now()
  const { nextUrl } = req
  const isLoggedIn = Boolean(req.auth)
  const isPublicOnlyRoute = publicOnlyRoutes.some((route) => nextUrl.pathname.startsWith(route))

  let response: NextResponse | undefined
  if (!isLoggedIn && !isPublicOnlyRoute) {
    response = NextResponse.redirect(new URL('/login', nextUrl))
  } else if (isLoggedIn && isPublicOnlyRoute) {
    response = NextResponse.redirect(new URL('/', nextUrl))
  }

  after(() => {
    logRequest({
      method: req.method,
      path: nextUrl.pathname + nextUrl.search,
      ip: clientIpFromHeaders(req.headers),
      userId: req.auth?.user?.id ?? null,
      status: response?.status,
      durationMs: performance.now() - start,
    })
  })

  return response
})

export const config = {
  // Skip the public /s/[hash] redirect route, the auth API, static assets, and
  // the metadata file-convention routes (favicon/icon/apple-icon/manifest/OG
  // image) — these must stay reachable pre-login for browsers, PWA installers,
  // link-preview crawlers, and (for logo.png) email clients rendering the
  // verification email's logo for a not-yet-logged-in recipient.
  matcher: [
    '/((?!api|s/|_next/static|_next/image|favicon\\.ico|icon\\.(?:svg|png)|apple-icon\\.png|opengraph-image\\.jpg|manifest\\.json|web-app-manifest-.*\\.png|logo\\.png).*)',
  ],
}
