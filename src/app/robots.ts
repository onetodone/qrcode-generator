import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/app-url'

const appUrl = getSiteUrl()

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // The more specific `allow` paths take precedence over `Disallow: /`; `/$` matches only the landing page.
      // Styles, scripts and icons stay crawlable so search engines render the pages as visitors see them.
      allow: [
        '/$',
        '/sitemap.xml',
        '/login',
        '/register',
        '/forgot-password',
        '/terms-of-use',
        '/privacy-policy',
        '/_next/static/',
        '/_next/image',
        '/favicon.ico',
        '/icon.',
        '/apple-icon.png',
        '/opengraph-image.jpg',
        '/manifest.json',
        '/web-app-manifest-',
        '/logo.png',
      ],
      disallow: '/',
    },
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
