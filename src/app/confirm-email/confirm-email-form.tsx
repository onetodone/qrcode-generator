'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { confirmEmailAction } from '@/actions/auth'
import type { FormState } from '@/lib/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

export function ConfirmEmailForm({
  token,
  email,
  choosePassword,
}: {
  token: string
  email: string
  choosePassword: boolean
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [state, action, pending] = useActionState<FormState, FormData>(confirmEmailAction, undefined)

  const address = <span className="font-medium text-foreground">{email}</span>

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{choosePassword ? 'Confirm your email' : 'Confirm your new email'}</CardTitle>
        <CardDescription>
          {choosePassword ? (
            <>Choose a password to finish creating your account for {address}.</>
          ) : (
            <>Switch your account to {address}.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <input type="hidden" name="token" value={token} />
            {choosePassword && (
              <>
                {/* Lets password managers save the password under this email. */}
                <input type="email" value={email} autoComplete="username" readOnly hidden />
                <Field>
                  <FieldLabel htmlFor="newPassword">Password</FieldLabel>
                  <FieldContent>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmPassword">Repeat password</FieldLabel>
                  <FieldContent>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </FieldContent>
                </Field>
              </>
            )}
            {choosePassword && (
              <p className="text-sm text-muted-foreground">
                By confirming, you agree to the{' '}
                <Link href="/terms-of-use" target="_blank" className="underline underline-offset-4">
                  Terms of Use
                </Link>{' '}
                and confirm you have read the{' '}
                <Link href="/privacy-policy" target="_blank" className="underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </p>
            )}
            {state?.error && <FieldError>{state.error}</FieldError>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Confirming...' : choosePassword ? 'Confirm and sign in' : 'Confirm new email'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
