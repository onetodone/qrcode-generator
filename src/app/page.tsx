import Link from 'next/link'
import { ChartColumnIcon, Link2Icon, QrCodeIcon } from 'lucide-react'
import { getSessionUserId } from '@/lib/auth-guard'
import { getBaseUrl } from '@/lib/request'
import { DEFAULT_BG_COLOR, DEFAULT_FG_COLOR } from '@/schemas/qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { QrImage } from '@/components/qrcode/qr-image'

const STEPS = [
  {
    icon: QrCodeIcon,
    title: 'Create a code',
    description:
      'Enter a link, phone number or email address, pick a shape and colors, and download the code as SVG or PNG.',
  },
  {
    icon: Link2Icon,
    title: 'Share the short link',
    description:
      'The code points to its own short link, so you can change the destination later and printed codes keep working.',
  },
  {
    icon: ChartColumnIcon,
    title: 'Count the scans',
    description: 'See how many times each code was scanned, and add a note to remember where it’s posted.',
  },
]

export default async function HomePage() {
  const [userId, baseUrl] = await Promise.all([getSessionUserId(), getBaseUrl()])
  const signedIn = userId !== null

  return (
    <>
      <PublicHeader signedIn={signedIn} />
      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-8 sm:py-20 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col items-start gap-6">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              QR codes that count their scans
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              Create a QR code, hand out the short link it points to, and see how many times each code has been scanned.
            </p>
            <div className="flex flex-wrap gap-2">
              {signedIn ? (
                <Button size="lg" nativeButton={false} render={<Link href="/qrcodes" />}>
                  My QR Codes
                </Button>
              ) : (
                <>
                  <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
                    Get started
                  </Button>
                  <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
                    Sign in
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="justify-self-center overflow-hidden rounded-lg border">
            <QrImage
              value={baseUrl}
              shape="ROUNDED"
              fgColor={DEFAULT_FG_COLOR}
              bgColor={DEFAULT_BG_COLOR}
              size={200}
              title="QR code linking to this page"
            />
          </div>
        </section>
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 sm:px-8 sm:pb-20">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex">
                <Card className="w-full">
                  <CardHeader>
                    <Icon className="mb-2 size-6 text-muted-foreground" aria-hidden />
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
