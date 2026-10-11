import type { Metadata } from 'next'
import { connection } from 'next/server'
import { AuthLayout } from '@/components/auth-card'
import { oauthProviderOptions } from '@/lib/oauth-providers'
import { signInErrorMessage } from '@/lib/sign-in-errors'
import { getCaptchaSiteKey } from '@/lib/captcha'
import { getClientIp } from '@/lib/request'
import { isLoginCaptchaRequired } from '@/auth'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  await connection()
  const { error } = await searchParams

  return (
    <AuthLayout>
      <LoginForm
        providers={oauthProviderOptions()}
        providerError={signInErrorMessage(typeof error === 'string' ? error : undefined, 'login')}
        captchaSiteKey={getCaptchaSiteKey()}
        captchaRequired={isLoginCaptchaRequired(await getClientIp())}
      />
    </AuthLayout>
  )
}
