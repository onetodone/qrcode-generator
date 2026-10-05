import { accountSuspendedMessage } from '@/lib/auth-guard'
import { ProviderSignInError } from '@/lib/oauth-providers'

/** Shown when an action needs a sign-in from the last 10 minutes. */
export const RECENT_SIGN_IN_REQUIRED = 'For your security, sign out and sign in again, then retry within 10 minutes.'

const FAILED = 'Sign-in through the provider was cancelled or failed. Please try again.'

/**
 * Message for the `?error=` code a provider sign-in redirects with, or `null`
 * without one. `/login` shows it to guests; `/profile` shows it after an
 * attempt to connect a provider.
 */
export function signInErrorMessage(code: string | undefined, page: 'login' | 'profile'): string | null {
  if (!code) return null
  switch (code) {
    case 'CredentialsSignin':
      return 'Invalid email or password.'
    case 'OAuthAccountNotLinked':
      return page === 'login'
        ? 'An account with this email already exists. Sign in with your password, then connect the provider on your profile page.'
        : 'This provider account is already connected to another account.'
    case ProviderSignInError.AccountSuspended:
      return accountSuspendedMessage()
    case ProviderSignInError.EmailNotVerified:
      return "This provider didn't confirm a verified email address, so it can't create an account. Register with your email, then connect the provider on your profile page."
    case ProviderSignInError.SessionExpired:
      return 'Your session has expired. Please sign in again.'
    case ProviderSignInError.ReauthRequired:
      return RECENT_SIGN_IN_REQUIRED
    default:
      return FAILED
  }
}
