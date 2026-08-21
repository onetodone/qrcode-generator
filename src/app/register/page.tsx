import type { Metadata } from 'next'
import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'Register — QR Codes',
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <RegisterForm />
    </div>
  )
}
