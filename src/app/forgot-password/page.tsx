import type { Metadata } from 'next'
import { connection } from 'next/server'
import { AuthLayout } from '@/components/auth-card'
import { getCaptchaSiteKey } from '@/lib/captcha'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot password',
}

export default async function ForgotPasswordPage() {
  await connection()

  return (
    <AuthLayout>
      <ForgotPasswordForm captchaSiteKey={getCaptchaSiteKey()} />
    </AuthLayout>
  )
}
