import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/app-url'

const appUrl = getSiteUrl()

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // The more specific `allow` paths take precedence over `Disallow: /`; `/$` matches only the landing page.
      allow: ['/$', '/sitemap.xml', '/login', '/register', '/forgot-password', '/terms-of-use', '/privacy-policy'],
      disallow: '/',
    },
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
