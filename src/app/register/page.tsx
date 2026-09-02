import type { Metadata } from 'next'
import { AuthLayout } from '@/components/auth-card'
import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'Register',
}

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  )
}
