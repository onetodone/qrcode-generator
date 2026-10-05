import type { Metadata } from 'next'
import { connection } from 'next/server'
import { AuthLayout } from '@/components/auth-card'
import { oauthProviderOptions } from '@/lib/oauth-providers'
import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'Register',
}

export default async function RegisterPage() {
  await connection()

  return (
    <AuthLayout>
      <RegisterForm providers={oauthProviderOptions()} />
    </AuthLayout>
  )
}
