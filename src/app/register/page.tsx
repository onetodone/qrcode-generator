import type { Metadata } from 'next'
import { connection } from 'next/server'
import { AuthLayout } from '@/components/auth-card'
import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'Register',
}

export default async function RegisterPage() {
  await connection()

  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  )
}
