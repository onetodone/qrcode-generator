'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateProfileAction, type ProfileFormState } from '@/actions/profile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

export function ProfileForm({
  defaultName,
  defaultEmail,
  emailVerified,
}: {
  defaultName: string
  defaultEmail: string
  emailVerified: boolean
}) {
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const router = useRouter()
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, undefined)

  useEffect(() => {
    if (state?.success) {
      toast.success('Profile updated.')
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account details</CardTitle>
        <CardDescription>Update your name and email address.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <FieldContent>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="email" className="items-center gap-2">
                Email
                <Badge variant={emailVerified ? 'secondary' : 'destructive'}>
                  {emailVerified ? 'Confirmed' : 'Not confirmed'}
                </Badge>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </FieldContent>
            </Field>
            {state?.error && <FieldError>{state.error}</FieldError>}
            <Button type="submit" disabled={pending} className="self-end">
              {pending ? 'Saving...' : 'Save changes'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
