'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction, type ResetPasswordFormState } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [state, action, pending] = useActionState<ResetPasswordFormState, FormData>(forgotPasswordAction, undefined)

  if (state?.success) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for {email}, we&apos;ve sent a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline" nativeButton={false} render={<Link href="/login" />}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Forgot password?</CardTitle>
        <CardDescription>Enter your email and we&apos;ll send you a link to reset your password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <FieldContent>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </FieldContent>
            </Field>
            {state?.error && <FieldError>{state.error}</FieldError>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Sending...' : 'Send reset link'}
            </Button>
          </FieldGroup>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
