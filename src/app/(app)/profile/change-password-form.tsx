'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { changePasswordAction, type ProfileFormState } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

const emptyFields = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function ChangePasswordForm() {
  const [fields, setFields] = useState(emptyFields)
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(changePasswordAction, undefined)

  // Don't leave old/new passwords sitting in the form after a successful
  // change. Done during render (comparing against the previous state)
  // rather than in an Effect, since setState calls that just react to a
  // changed value belong in the render phase, not an Effect body.
  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state?.success) {
      setFields(emptyFields)
    }
  }

  // The toast is a genuine external side effect, so it stays in an Effect.
  useEffect(() => {
    if (state?.success) {
      toast.success('Password changed.')
    }
  }, [state])

  function updateField(key: keyof typeof emptyFields) {
    return (event: React.ChangeEvent<HTMLInputElement>) => setFields((prev) => ({ ...prev, [key]: event.target.value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
              <FieldContent>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={fields.currentPassword}
                  onChange={updateField('currentPassword')}
                  required
                />
              </FieldContent>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                <FieldContent>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={fields.newPassword}
                    onChange={updateField('newPassword')}
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Repeat new password</FieldLabel>
                <FieldContent>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={fields.confirmPassword}
                    onChange={updateField('confirmPassword')}
                    required
                  />
                </FieldContent>
              </Field>
            </div>
            {state?.error && <FieldError>{state.error}</FieldError>}
            <Button type="submit" disabled={pending} className="self-start">
              {pending ? 'Changing...' : 'Change password'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
