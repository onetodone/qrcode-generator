import { after, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { signIn, VerificationTokenExpiredSignin, VerificationTokenInvalidSignin } from '@/auth'
import { logRequest } from '@/lib/logger'
import { clientIpFromHeaders } from '@/lib/request'

export async function GET(request: Request) {
  const start = performance.now()
  const requestHeaders = await headers()

  after(() => {
    logRequest({
      method: 'GET',
      path: '/api/verify-email',
      ip: clientIpFromHeaders(requestHeaders),
      durationMs: performance.now() - start,
    })
  })

  const token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }

  try {
    await signIn('credentials', { verificationToken: token, redirectTo: '/' })
  } catch (error) {
    if (error instanceof VerificationTokenExpiredSignin) {
      const url = new URL('/verify-email', request.url)
      url.searchParams.set('status', 'expired')
      url.searchParams.set('email', error.email)
      return NextResponse.redirect(url)
    }
    if (error instanceof VerificationTokenInvalidSignin) {
      return NextResponse.redirect(new URL('/verify-email?status=invalid', request.url))
    }
    throw error
  }
}
