import type { MetadataRoute } from 'next'

const appUrl =
  process.env.APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  `http://localhost:${process.env.PORT ?? 3000}`

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // The more specific `allow` paths take precedence over `Disallow: /`; `/$` matches only the landing page.
      allow: ['/$', '/login', '/register', '/forgot-password', '/terms-of-use', '/privacy-policy'],
      disallow: '/',
    },
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
