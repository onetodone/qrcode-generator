'use client'

import { useActionState, useState } from 'react'
import { deleteAccountAction } from '@/actions/profile'
import type { FormState } from '@/lib/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

function codesLabel(count: number): string {
  return `${count} QR code${count === 1 ? '' : 's'}`
}

type DeleteAccountProps = { email: string; hasPassword: boolean; qrCodeCount: number }

function DeleteAccountDialogForm({ email, hasPassword, qrCodeCount }: DeleteAccountProps) {
  const [confirmation, setConfirmation] = useState('')
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccountAction, undefined)

  return (
    <form action={action} className="contents">
      <AlertDialogHeader>
        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
        <AlertDialogDescription>
          {qrCodeCount > 0 ? (
            <>
              This permanently deletes your account and your {codesLabel(qrCodeCount)}, including scan counts. Anyone
              who scans a deleted code afterwards, including a printed copy, will get a 404.
            </>
          ) : (
            <>This permanently deletes your account.</>
          )}{' '}
          This can&rsquo;t be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <FieldGroup>
        {hasPassword ? (
          <>
            <input type="email" value={email} autoComplete="username" readOnly hidden />
            <Field>
              <FieldLabel htmlFor="deleteAccountPassword">Current password</FieldLabel>
              <FieldContent>
                <Input
                  id="deleteAccountPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                />
              </FieldContent>
            </Field>
          </>
        ) : (
          <Field>
            <FieldLabel htmlFor="deleteAccountEmail">Type {email} to confirm</FieldLabel>
            <FieldContent>
              <Input
                id="deleteAccountEmail"
                name="confirmEmail"
                type="email"
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </FieldContent>
          </Field>
        )}
        {state?.error && <FieldError>{state.error}</FieldError>}
      </FieldGroup>
      <AlertDialogFooter>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? 'Deleting...' : 'Delete account'}
        </Button>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
      </AlertDialogFooter>
    </form>
  )
}

export function DeleteAccountForm({ email, hasPassword, qrCodeCount }: DeleteAccountProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>
          {qrCodeCount > 0
            ? `Permanently delete your account and your ${codesLabel(qrCodeCount)}. Deleted codes stop working, including printed copies.`
            : 'Permanently delete your account.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" />}>Delete account</AlertDialogTrigger>
          <AlertDialogContent>
            <DeleteAccountDialogForm email={email} hasPassword={hasPassword} qrCodeCount={qrCodeCount} />
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
