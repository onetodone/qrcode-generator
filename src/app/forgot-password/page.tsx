import type { Metadata } from 'next'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot password',
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <ForgotPasswordForm />
    </div>
  )
}
