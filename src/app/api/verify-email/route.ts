import { NextResponse } from 'next/server'
import { signIn, VerificationTokenExpiredSignin, VerificationTokenInvalidSignin } from '@/auth'

export async function GET(request: Request) {
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
