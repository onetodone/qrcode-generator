import type { ReactNode } from 'react'
import { getSessionUserId } from '@/lib/auth-guard'
import { LEGAL_LAST_UPDATED } from '@/lib/legal'
import { PublicHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

const PROSE_CLASS = [
  'mx-auto w-full max-w-3xl px-4 py-12 sm:px-8 sm:py-16',
  '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold',
  '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold',
  '[&_p]:my-3 [&_p]:leading-7',
  '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_li]:leading-7',
  '[&_a]:underline [&_a]:underline-offset-4 [&_code]:font-mono [&_code]:text-sm',
].join(' ')

const lastUpdated = LEGAL_LAST_UPDATED.toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
})

/** Public page for a legal text: header, title, last-updated date, the text, footer. */
export async function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const signedIn = (await getSessionUserId()) !== null

  return (
    <>
      <PublicHeader signedIn={signedIn} />
      <main className="flex-1">
        <article className={PROSE_CLASS}>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  )
}

/** A mailto link, or `fallback` when the address isn't configured. */
export function EmailLink({
  email,
  fallback = 'the contact address of this service',
}: {
  email: string | null
  fallback?: string
}) {
  return email ? <a href={`mailto:${email}`}>{email}</a> : <>{fallback}</>
}

/** How the legal texts name the operator when `LEGAL_OPERATOR_NAME` isn't set. */
export const UNNAMED_OPERATOR = 'the person or organization that runs this instance of the Service'
