import type { Session } from 'next-auth'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

/**
 * The signed-in user's id, or `null`. For Server Actions, which report an
 * unauthenticated caller as a form error rather than a redirect.
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/** The current session; redirects to `/login` when there is none. For pages. */
export async function requireSession(): Promise<Session> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }
  return session
}

/** The signed-in user's id; redirects to `/login` when there is none. For pages. */
export async function requireUserId(): Promise<string> {
  const session = await requireSession()
  return session.user.id
}
