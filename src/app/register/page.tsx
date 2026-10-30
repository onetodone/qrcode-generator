import type { Metadata } from 'next'
import { connection } from 'next/server'
import { AuthLayout } from '@/components/auth-card'
import { oauthProviderOptions } from '@/lib/oauth-providers'
import { getCaptchaSiteKey } from '@/lib/captcha'
import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'Register',
  alternates: { canonical: '/register' },
}

export default async function RegisterPage() {
  await connection()

  return (
    <AuthLayout>
      <RegisterForm providers={oauthProviderOptions()} captchaSiteKey={getCaptchaSiteKey()} />
    </AuthLayout>
  )
}
