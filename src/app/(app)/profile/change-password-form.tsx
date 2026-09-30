'use client'

import { useActionState, useState } from 'react'
import { toast } from 'sonner'
import { changePasswordAction } from '@/actions/profile'
import type { FormState } from '@/lib/forms'
import { useActionResult } from '@/hooks/use-action-result'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

const emptyFields = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function ChangePasswordForm() {
  const [fields, setFields] = useState(emptyFields)
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, undefined)

  // Clear the password fields after a successful change. Done during render,
  // not in an Effect, because it only reacts to a changed value.
  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state?.success) {
      setFields(emptyFields)
    }
  }

  useActionResult(state, { onSuccess: () => toast.success('Password changed.') })

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
            <Button type="submit" disabled={pending} className="self-end">
              {pending ? 'Changing...' : 'Change password'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
