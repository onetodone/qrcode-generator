'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'
import { oauthSignInAction } from '@/actions/auth'
import { disconnectProviderAction } from '@/actions/profile'
import type { FormState } from '@/lib/forms'
import { useActionResult } from '@/hooks/use-action-result'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field'
import { ProviderIcon } from '@/components/provider-icons'

export type ConnectedProvider = {
  id: string
  name: string
  connected: boolean
  /** False for a connected provider that this instance no longer offers. */
  enabled: boolean
}

export function ConnectedAccounts({
  providers,
  isOnlySignInMethod,
  error,
}: {
  providers: ConnectedProvider[]
  /** True when the account has no password and a single connected provider. */
  isOnlySignInMethod: boolean
  error: string | null
}) {
  const [connectState, connectAction, connecting] = useActionState<FormState, FormData>(oauthSignInAction, undefined)
  const [disconnectState, disconnectAction, disconnecting] = useActionState<FormState, FormData>(
    disconnectProviderAction,
    undefined,
  )
  useActionResult(disconnectState, { onSuccess: () => toast.success('Provider disconnected.') })

  const message = connectState?.error ?? disconnectState?.error ?? error

  return (
    <Card id="connected-accounts">
      <CardHeader>
        <CardTitle>Connected accounts</CardTitle>
        <CardDescription>Sign in with a provider instead of your password.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col divide-y">
          {providers.map((provider) => (
            <li key={provider.id} className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
              <span className="flex items-center gap-2 text-sm">
                <ProviderIcon providerId={provider.id} className="size-4" />
                {provider.name}
                {provider.connected && <span className="text-muted-foreground">· connected</span>}
              </span>
              {provider.connected ? (
                <form action={disconnectAction}>
                  <input type="hidden" name="provider" value={provider.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={disconnecting || isOnlySignInMethod}
                    title={isOnlySignInMethod ? 'Set a password or connect another provider first.' : undefined}
                  >
                    Disconnect
                  </Button>
                </form>
              ) : (
                provider.enabled && (
                  <form action={connectAction}>
                    <input type="hidden" name="provider" value={provider.id} />
                    <Button type="submit" variant="outline" size="sm" disabled={connecting}>
                      Connect
                    </Button>
                  </form>
                )
              )}
            </li>
          ))}
        </ul>
        {message && <FieldError>{message}</FieldError>}
      </CardContent>
    </Card>
  )
}
