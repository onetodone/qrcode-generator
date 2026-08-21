import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const publicRoutes = ['/login', '/register']

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = Boolean(req.auth)
  const isPublicRoute = publicRoutes.some((route) => nextUrl.pathname.startsWith(route))

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL('/', nextUrl))
  }
})

export const config = {
  // Skip the public /s/[hash] redirect route, the auth API, and static assets.
  matcher: ['/((?!api|s/|_next/static|_next/image|favicon.ico).*)'],
}
