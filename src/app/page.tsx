import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ChartColumnIcon,
  DownloadIcon,
  Link2Icon,
  PaletteIcon,
  PencilIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  StickyNoteIcon,
  TrashIcon,
} from 'lucide-react'
import { getSiteUrl } from '@/lib/app-url'
import { getSessionUserId } from '@/lib/auth-guard'
import { getBaseUrl } from '@/lib/request'
import { DAILY_CREATE_LIMIT, DEFAULT_BG_COLOR, DEFAULT_FG_COLOR } from '@/schemas/qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader } from '@/components/ui/card'
import { PublicHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { QrImage } from '@/components/qrcode/qr-image'

const TITLE = 'Free QR Code Generator with Scan Tracking'
const metadataDescription =
  'Create free QR codes for links, phone numbers and email addresses, change where they lead after printing, and count their scans.'

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | QR Code OneToDone` },
  alternates: { canonical: '/' },
}

const STEPS = [
  {
    icon: QrCodeIcon,
    title: 'Create a code',
    description:
      'Enter a link, phone number or email address, pick a shape and colors, and download the code as SVG, PNG or JPG.',
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

const KINDS = [
  {
    title: 'Dynamic QR code',
    description:
      'The code holds a short link to this site, which forwards each scan to your destination. You see how many times the code was scanned and can change where it leads at any time, without reprinting it. The short link works as long as the code exists.',
  },
  {
    title: 'Direct QR code',
    description:
      'The code holds the destination itself, so scanning it opens the page, dials the number or starts the email without going through this site. Scans aren’t counted, the destination can’t be changed later, and printed copies keep working even after you delete the code.',
  },
]

const FEATURES = [
  {
    icon: QrCodeIcon,
    title: 'Links, phone numbers and email',
    description:
      'Type a web address, a phone number or an email address. Scanning opens the page, offers to call the number or starts a new email.',
  },
  {
    icon: PencilIcon,
    title: 'Change the destination after printing',
    description:
      'A dynamic code keeps its short link when you edit it, so posters, flyers and labels already in use follow the new destination.',
  },
  {
    icon: ChartColumnIcon,
    title: 'Scan counts per code',
    description:
      'Every dynamic code has its own counter. Bots and link previews are left out where possible, so the number reflects real scans.',
  },
  {
    icon: StickyNoteIcon,
    title: 'Notes',
    description:
      'Add a note to each code, such as “table cards, café on Main St.”, to remember where it’s posted and compare places by scans.',
  },
  {
    icon: PaletteIcon,
    title: 'Shapes and colors',
    description:
      'Draw the code with square, rounded or dot modules and pick its foreground and background colors to match your design.',
  },
  {
    icon: DownloadIcon,
    title: 'SVG, PNG and JPG',
    description:
      'Download a sharp vector SVG for print, a PNG with a transparent background, or a JPG for anywhere else.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Safe destinations',
    description:
      'Web destinations are checked with Google Safe Browsing, so the codes you print don’t send people to harmful sites.',
  },
  {
    icon: TrashIcon,
    title: 'Your data, your choice',
    description:
      'Scans are counted without cookies and without recording who scanned. Delete a code or your whole account at any time.',
  },
]

const USE_CASES = [
  'Restaurant menus and table cards',
  'Posters, flyers and event tickets',
  'Business cards and name badges',
  'Product packaging and labels',
  'Shop windows and price tags',
  'Presentations and printed reports',
]

const FAQ = [
  {
    question: 'Is it free?',
    answer: `Yes. Creating an account, making QR codes, downloading them and counting scans costs nothing. To prevent abuse, one account can create up to ${DAILY_CREATE_LIMIT} new codes per 24 hours.`,
  },
  {
    question: 'Do I need an account?',
    answer:
      'Yes. Codes and their scan counts belong to your account, so only you can see, edit or delete them. Signing up takes an email address and a password.',
  },
  {
    question: 'Can I change where a QR code leads after printing it?',
    answer:
      'Yes, if it’s a dynamic code. Edit its destination in your account and every printed copy leads to the new address. A direct code can’t be changed, because the destination is part of the image.',
  },
  {
    question: 'How are scans counted?',
    answer:
      'Each time someone opens the short link of a dynamic code, its counter goes up by one. No cookies are set and who scanned isn’t recorded, so you see a total per code rather than a list of people.',
  },
  {
    question: 'Should I choose a dynamic or a direct code?',
    answer:
      'Choose dynamic when you want scan counts or may need to change the destination later. Choose direct when the code must work on its own for good, with no tracking and no dependency on this site.',
  },
  {
    question: 'Which file format should I download?',
    answer:
      'SVG for print and large formats, since it stays sharp at any size. PNG with a transparent background for designs and documents. JPG where only a plain image is accepted.',
  },
]

export default async function HomePage() {
  const [userId, baseUrl] = await Promise.all([getSessionUserId(), getBaseUrl()])
  const signedIn = userId !== null
  const siteUrl = getSiteUrl()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'QR Code OneToDone',
        url: `${siteUrl}/`,
        description: metadataDescription,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  }

  const callToAction = signedIn ? (
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
  )

  return (
    <>
      <PublicHeader signedIn={signedIn} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-8 sm:py-20 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col items-start gap-6">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              QR codes that count their scans
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              A free QR code generator for links, phone numbers and email addresses. Hand out the short link a code
              points to, change where it leads at any time, and see how many times each code has been scanned.
            </p>
            <div className="flex flex-wrap gap-2">{callToAction}</div>
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
                    <h3 className="text-base leading-snug font-medium">{title}</h3>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ol>
        </section>
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 sm:px-8 sm:pb-20">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold">Dynamic or direct</h2>
            <p className="max-w-3xl text-pretty text-muted-foreground">
              When you create a code, choose how it works. The choice is made once, since printed codes can’t change.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {KINDS.map(({ title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <h3 className="text-base leading-snug font-medium">{title}</h3>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 sm:px-8 sm:pb-20">
          <h2 className="text-2xl font-semibold">Features</h2>
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex flex-col gap-2">
                <Icon className="size-5 text-muted-foreground" aria-hidden />
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-pretty text-muted-foreground">{description}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 sm:px-8 sm:pb-20">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold">Where to use them</h2>
            <p className="max-w-3xl text-pretty text-muted-foreground">
              Put a separate code on each place you advertise and add a note to it. The scan counts show which places
              bring visitors.
            </p>
          </div>
          <ul className="grid list-disc gap-x-8 gap-y-2 pl-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((useCase) => (
              <li key={useCase}>{useCase}</li>
            ))}
          </ul>
        </section>
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 sm:px-8 sm:pb-20">
          <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
          <dl className="grid gap-6 md:grid-cols-2">
            {FAQ.map(({ question, answer }) => (
              <div key={question} className="flex flex-col gap-2">
                <dt className="font-medium">{question}</dt>
                <dd className="text-sm text-pretty text-muted-foreground">{answer}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 pb-12 sm:px-8 sm:pb-20">
          <h2 className="text-2xl font-semibold">Make your first QR code</h2>
          <p className="max-w-3xl text-pretty text-muted-foreground">
            It’s free and takes a minute: create an account, enter a destination and download the code.
          </p>
          <div className="flex flex-wrap gap-2">{callToAction}</div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
