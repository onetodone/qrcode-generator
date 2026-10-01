import { after, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { logRequest } from '@/lib/logger'
import { setHandoffCookie } from '@/lib/handoff-cookies'
import { clientIpFromHeaders } from '@/lib/request'

// The token is only handed to `/confirm-email`, which asks for a click before
// using it: link scanners that open the link don't use it up, and a link
// alone can't sign anyone in.
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

  const response = NextResponse.redirect(new URL('/confirm-email', request.url))
  setHandoffCookie(response, 'confirmToken', token, requestHeaders)
  return response
}
