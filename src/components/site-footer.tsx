import { getLegalInfo } from '@/lib/legal'
import { LegalLinks } from '@/components/legal-links'

export function SiteFooter() {
  const { supportEmail } = getLegalInfo()

  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 p-4 text-sm text-muted-foreground sm:px-8">
        <p>&copy; {new Date().getFullYear()} QR Code OneToDone</p>
        <LegalLinks contactEmail={supportEmail} />
      </div>
    </footer>
  )
}
