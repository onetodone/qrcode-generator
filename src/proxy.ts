import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const publicOnlyRoutes = ['/login', '/register', '/verify-email']

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = Boolean(req.auth)
  const isPublicOnlyRoute = publicOnlyRoutes.some((route) => nextUrl.pathname.startsWith(route))

  if (!isLoggedIn && !isPublicOnlyRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isLoggedIn && isPublicOnlyRoute) {
    return NextResponse.redirect(new URL('/', nextUrl))
  }
})

export const config = {
  // Skip the public /s/[hash] redirect route, the auth API, static assets, and
  // the metadata file-convention routes (favicon/icon/apple-icon/manifest/OG
  // image) — these must stay reachable pre-login for browsers, PWA installers,
  // link-preview crawlers, and (for logo-mail.png) email clients rendering the
  // verification email's logo for a not-yet-logged-in recipient.
  matcher: [
    '/((?!api|s/|_next/static|_next/image|favicon\\.ico|icon\\.(?:svg|png)|apple-icon\\.png|opengraph-image\\.jpg|manifest\\.json|web-app-manifest-.*\\.png|logo-mail\\.png).*)',
  ],
}
