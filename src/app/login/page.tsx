import type { Metadata } from 'next'
import { connection } from 'next/server'
import { AuthLayout } from '@/components/auth-card'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function LoginPage() {
  await connection()

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}
