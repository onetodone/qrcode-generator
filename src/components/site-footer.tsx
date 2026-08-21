export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 p-4 text-sm text-muted-foreground sm:px-8">
        <p>QR Code — internal tool.</p>
        <p>&copy; {new Date().getFullYear()}</p>
      </div>
    </footer>
  )
}
