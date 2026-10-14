import { afterEach, describe, expect, test, vi } from 'vitest'
import { enabledOAuthProviders, findOAuthProvider, oauthProviderName } from '@/lib/oauth-providers'

afterEach(() => {
  vi.unstubAllEnvs()
})

function enable(id: string): NonNullable<ReturnType<typeof findOAuthProvider>> {
  const prefix = `AUTH_${id.toUpperCase().replace(/-/g, '_')}`
  vi.stubEnv(`${prefix}_ID`, 'id')
  vi.stubEnv(`${prefix}_SECRET`, 'secret')
  const provider = findOAuthProvider(id)
  if (!provider) throw new Error(`${id} is not a provider`)
  return provider
}

describe('enabled providers', () => {
  test('need both the client id and the secret', () => {
    vi.stubEnv('AUTH_GOOGLE_ID', 'id')
    vi.stubEnv('AUTH_GOOGLE_SECRET', ' ')
    expect(findOAuthProvider('google')).toBeUndefined()
    vi.stubEnv('AUTH_GOOGLE_SECRET', 'secret')
    expect(enabledOAuthProviders().map((provider) => provider.id)).toContain('google')
  })

  test('names stay known after a provider is turned off', () => {
    expect(oauthProviderName('microsoft-entra-id')).toBe('Microsoft')
    expect(oauthProviderName('unknown')).toBe('unknown')
  })
})

describe('hasVerifiedEmail', () => {
  test.each([
    ['google', { email_verified: true }, true],
    ['google', { email_verified: 'true' }, false],
    ['google', {}, false],
    ['github', { email_verified: true }, true],
    ['github', { email_verified: false }, false],
    ['microsoft-entra-id', { tid: '9188040d-6c67-4c5b-b112-36a304b66dad' }, true],
    ['microsoft-entra-id', { tid: 'work-tenant', xms_edov: true }, true],
    ['microsoft-entra-id', { tid: 'work-tenant', xms_edov: 1 }, true],
    ['microsoft-entra-id', { tid: 'work-tenant' }, false],
    ['facebook', { email: 'a@example.com' }, false],
    ['discord', { verified: true }, true],
    ['discord', { verified: false }, false],
    ['gitlab', { email: 'a@example.com', confirmed_at: '2026-01-01' }, true],
    ['gitlab', { email: 'a@example.com', confirmed_at: null }, false],
    ['linkedin', { email_verified: true }, true],
  ])('%s %j → %s', (id, profile, expected) => {
    expect(enable(id).hasVerifiedEmail(profile)).toBe(expected)
  })
})
