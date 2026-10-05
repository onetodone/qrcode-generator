'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { oauthSignInAction } from '@/actions/auth'
import type { FormState } from '@/lib/forms'
import type { OAuthProviderOption } from '@/lib/oauth-providers'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import { ProviderIcon } from '@/components/provider-icons'

/**
 * A row of equal-width icon buttons, one per enabled provider and titled
 * "Continue with …", with the terms notice that a new account accepts, and
 * an "or" divider before the email form. Renders nothing without providers.
 */
export function OAuthButtons({ providers, error }: { providers: OAuthProviderOption[]; error?: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(oauthSignInAction, undefined)
  if (providers.length === 0) return null

  const message = state?.error ?? error

  return (
    <div className="mb-4 flex flex-col gap-4">
      <form action={action} className="flex gap-2">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            type="submit"
            name="provider"
            value={provider.id}
            variant="outline"
            disabled={pending}
            title={`Continue with ${provider.name}`}
            aria-label={`Continue with ${provider.name}`}
            className="min-w-0 flex-1"
          >
            <ProviderIcon providerId={provider.id} className="size-4" />
          </Button>
        ))}
      </form>
      <p className="text-xs text-muted-foreground">
        By creating an account, you agree to the{' '}
        <Link href="/terms-of-use" target="_blank" className="underline underline-offset-4">
          Terms of Use
        </Link>{' '}
        and have read the{' '}
        <Link href="/privacy-policy" target="_blank" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
      {message && <FieldError>{message}</FieldError>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
