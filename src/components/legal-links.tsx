import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CookieSettingsButton } from '@/components/analytics-consent'

const LINK_CLASS = 'hover:text-foreground hover:underline underline-offset-4'

/** Terms of Use, Privacy Policy, cookie settings (when analytics is on) and an optional contact address. */
export function LegalLinks({ contactEmail, className }: { contactEmail?: string | null; className?: string }) {
  return (
    <nav aria-label="Legal" className={cn('flex flex-wrap items-center gap-x-4 gap-y-1', className)}>
      <Link href="/terms-of-use" className={LINK_CLASS}>
        Terms of Use
      </Link>
      <Link href="/privacy-policy" className={LINK_CLASS}>
        Privacy Policy
      </Link>
      <CookieSettingsButton className={cn(LINK_CLASS, 'cursor-pointer')} />
      {contactEmail && (
        <a href={`mailto:${contactEmail}`} className={LINK_CLASS}>
          Contact
        </a>
      )}
    </nav>
  )
}
