import { describe, expect, test } from 'vitest'
import { confirmAccountSchema, emailSchema, loginSchema, registerSchema, resetPasswordSchema } from '@/schemas/auth'
import { changePasswordSchema, deleteAccountSchema, updateProfileSchema } from '@/schemas/profile'
import { qrCodeFormSchema } from '@/schemas/qrcode'
import { firstZodError } from '@/lib/forms'

function errorOf(result: { success: boolean; error?: Parameters<typeof firstZodError>[0] }): string | undefined {
  return result.error ? firstZodError(result.error) : undefined
}

describe('email fields', () => {
  test('are trimmed and lowercased everywhere', () => {
    expect(emailSchema.parse('  Victim@Example.COM ')).toBe('victim@example.com')
    expect(loginSchema.parse({ email: 'A@B.CO', password: 'x' }).email).toBe('a@b.co')
    expect(registerSchema.parse({ name: 'Ann', email: 'A@B.CO', acceptTerms: 'on' }).email).toBe('a@b.co')
    expect(updateProfileSchema.parse({ name: 'Ann', email: 'A@B.CO' }).email).toBe('a@b.co')
  })

  test('reject invalid addresses', () => {
    expect(errorOf(emailSchema.safeParse('not-an-email'))).toBe('Please enter a valid email address.')
    expect(errorOf(emailSchema.safeParse(null))).toBe('Please enter a valid email address.')
  })
})

describe('registerSchema', () => {
  test('requires agreement to the terms', () => {
    const result = registerSchema.safeParse({ name: 'Ann', email: 'a@b.co', acceptTerms: null })
    expect(errorOf(result)).toBe('Please agree to the Terms of Use to create an account.')
  })

  test('requires a name of at least 2 characters', () => {
    const result = registerSchema.safeParse({ name: 'A', email: 'a@b.co', acceptTerms: 'on' })
    expect(errorOf(result)).toBe('Name must be at least 2 characters.')
  })
})

describe('new password schemas', () => {
  const valid = { token: 't', newPassword: 'longenough', confirmPassword: 'longenough' }

  test.each([
    ['resetPasswordSchema', resetPasswordSchema],
    ['confirmAccountSchema', confirmAccountSchema],
  ])('%s accepts matching passwords of 8–72 characters', (_, schema) => {
    expect(schema.safeParse(valid).success).toBe(true)
    expect(schema.safeParse({ ...valid, newPassword: 'x'.repeat(72), confirmPassword: 'x'.repeat(72) }).success).toBe(
      true,
    )
  })

  test.each([
    ['resetPasswordSchema', resetPasswordSchema],
    ['confirmAccountSchema', confirmAccountSchema],
  ])('%s rejects short, long and mismatched passwords', (_, schema) => {
    expect(errorOf(schema.safeParse({ ...valid, newPassword: 'short', confirmPassword: 'short' }))).toBe(
      'Password must be at least 8 characters.',
    )
    expect(errorOf(schema.safeParse({ ...valid, newPassword: 'x'.repeat(73), confirmPassword: 'x'.repeat(73) }))).toBe(
      'Password must be at most 72 characters.',
    )
    expect(errorOf(schema.safeParse({ ...valid, confirmPassword: 'different1' }))).toBe('New passwords do not match.')
  })

  test('changePasswordSchema requires the current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'abcdefgh',
      confirmPassword: 'abcdefgh',
    })
    expect(errorOf(result)).toBe('Current password is required.')
  })
})

describe('deleteAccountSchema', () => {
  test('trims the typed email address', () => {
    expect(deleteAccountSchema.parse({ confirmEmail: ' a@b.co ' }).confirmEmail).toBe('a@b.co')
  })
})

describe('qrCodeFormSchema', () => {
  const valid = { leadsTo: 'example.com', note: 'Flyer' }

  test('fills in the default design and normalizes colors', () => {
    expect(qrCodeFormSchema.parse(valid)).toEqual({
      leadsTo: 'example.com',
      note: 'Flyer',
      shape: 'SQUARE',
      fgColor: '#000000',
      bgColor: '#ffffff',
    })
    expect(qrCodeFormSchema.parse({ ...valid, fgColor: ' #ABC ' }).fgColor).toBe('#abc')
  })

  test.each([
    [{ leadsTo: '' }, 'Endpoint is required.'],
    [{ leadsTo: 'x'.repeat(201) }, 'Endpoint must be at most 200 characters.'],
    [{ note: 'x'.repeat(201) }, 'Note must be at most 200 characters.'],
    [{ fgColor: 'red' }, 'Colors must be hex values like #1a2b3c.'],
    [{ fgColor: '#123456', bgColor: '#123456' }, 'Foreground and background colors must be different.'],
  ])('rejects %j', (overrides, message) => {
    expect(errorOf(qrCodeFormSchema.safeParse({ ...valid, ...overrides }))).toBe(message)
  })

  test('rejects an unknown shape', () => {
    expect(qrCodeFormSchema.safeParse({ ...valid, shape: 'STAR' }).success).toBe(false)
  })
})
