import type { Provider } from 'next-auth/providers'
import Discord from 'next-auth/providers/discord'
import Facebook from 'next-auth/providers/facebook'
import GitHub from 'next-auth/providers/github'
import GitLab from 'next-auth/providers/gitlab'
import Google from 'next-auth/providers/google'
import LinkedIn from 'next-auth/providers/linkedin'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'

type ProviderProfile = Record<string, unknown>

/** A third-party sign-in provider the app can offer. */
export type OAuthProviderEntry = {
  /** Auth.js provider id; also names its env variables, `AUTH_<ID>_ID` and `AUTH_<ID>_SECRET`. */
  id: string
  /** Shown on the sign-in button and the profile page. */
  name: string
  /** Origin of the provider's authorization page, allowed in the CSP's `form-action`. */
  authorizeOrigin: string
  create: () => Provider
  /** Whether the provider vouches that the profile's email address belongs to the user. */
  hasVerifiedEmail: (profile: ProviderProfile) => boolean
}

// Provider tokens aren't used after sign-in, so `Account` keeps only the link.
const withoutTokens = { account: () => ({}) }

// Tenant of personal Microsoft accounts, whose email addresses Microsoft verifies.
const MICROSOFT_CONSUMER_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad'

/** Codes of the provider sign-in errors that `?error=` carries in addition to Auth.js's own. */
export const ProviderSignInError = {
  AccountSuspended: 'AccountSuspended',
  EmailNotVerified: 'EmailNotVerified',
  SessionExpired: 'SessionExpired',
  ReauthRequired: 'ReauthRequired',
} as const

type GitHubEmail = { email: string; primary: boolean; verified: boolean }

const providers: OAuthProviderEntry[] = [
  {
    id: 'google',
    name: 'Google',
    authorizeOrigin: 'https://accounts.google.com',
    create: () => Google(withoutTokens),
    hasVerifiedEmail: (profile) => profile.email_verified === true,
  },
  {
    id: 'github',
    name: 'GitHub',
    authorizeOrigin: 'https://github.com',
    create: () =>
      GitHub({
        ...withoutTokens,
        // The default request falls back to the primary address even when it
        // isn't verified; only a verified primary address is used here.
        userinfo: {
          url: 'https://api.github.com/user',
          async request({ tokens }: { tokens: { access_token?: string } }) {
            const headers = { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'authjs' }
            const [profile, emails] = await Promise.all([
              fetch('https://api.github.com/user', { headers }).then((res) => res.json()),
              fetch('https://api.github.com/user/emails', { headers }).then((res) =>
                res.ok ? (res.json() as Promise<GitHubEmail[]>) : [],
              ),
            ])
            const primary = emails.find((entry) => entry.primary && entry.verified)
            return { ...profile, email: primary?.email ?? null, email_verified: Boolean(primary) }
          },
        },
      }),
    hasVerifiedEmail: (profile) => profile.email_verified === true,
  },
  {
    id: 'microsoft-entra-id',
    name: 'Microsoft',
    authorizeOrigin: 'https://login.microsoftonline.com',
    create: () =>
      MicrosoftEntraID({
        ...withoutTokens,
        // Skips the default profile photo download from Microsoft Graph.
        profile: (profile) => ({ id: profile.sub, name: profile.name, email: profile.email, image: null }),
      }),
    // Work and school accounts carry a verified address only with the
    // `xms_edov` optional claim configured on the app registration.
    hasVerifiedEmail: (profile) =>
      profile.tid === MICROSOFT_CONSUMER_TENANT_ID || profile.xms_edov === true || profile.xms_edov === 1,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    authorizeOrigin: 'https://www.facebook.com',
    create: () => Facebook(withoutTokens),
    // The Graph API doesn't say whether `email` is verified, so Facebook only
    // signs in to accounts it was connected to from the profile.
    hasVerifiedEmail: () => false,
  },
  {
    id: 'discord',
    name: 'Discord',
    authorizeOrigin: 'https://discord.com',
    create: () => Discord(withoutTokens),
    hasVerifiedEmail: (profile) => profile.verified === true,
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    authorizeOrigin: 'https://gitlab.com',
    create: () => GitLab(withoutTokens),
    hasVerifiedEmail: (profile) => typeof profile.email === 'string' && typeof profile.confirmed_at === 'string',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    authorizeOrigin: 'https://www.linkedin.com',
    create: () => LinkedIn(withoutTokens),
    hasVerifiedEmail: (profile) => profile.email_verified === true,
  },
]

function envPrefix(id: string): string {
  return `AUTH_${id.toUpperCase().replace(/-/g, '_')}`
}

function isConfigured(entry: OAuthProviderEntry): boolean {
  const prefix = envPrefix(entry.id)
  return Boolean(process.env[`${prefix}_ID`]?.trim() && process.env[`${prefix}_SECRET`]?.trim())
}

/** Providers whose client id and secret are set; the others are left out of sign-in entirely. */
export function enabledOAuthProviders(): OAuthProviderEntry[] {
  return providers.filter(isConfigured)
}

/** The enabled provider with this id, or `undefined`. */
export function findOAuthProvider(id: string): OAuthProviderEntry | undefined {
  return enabledOAuthProviders().find((entry) => entry.id === id)
}

/** Display name for a provider id, including providers that are no longer enabled. */
export function oauthProviderName(id: string): string {
  return providers.find((entry) => entry.id === id)?.name ?? id
}

/** Serializable id and name of a provider, for Client Components. */
export type OAuthProviderOption = { id: string; name: string }

/** The enabled providers as `{ id, name }`, in display order. */
export function oauthProviderOptions(): OAuthProviderOption[] {
  return enabledOAuthProviders().map(({ id, name }) => ({ id, name }))
}
