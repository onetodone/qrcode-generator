import type { MetadataRoute } from 'next'

const appUrl =
  process.env.APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  `http://localhost:${process.env.PORT ?? 3000}`

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // `Disallow: /` blocks everything; the `allow` entries below are more
      // specific paths and take precedence over it, so nothing else needs to
      // be named explicitly here.
      allow: ['/login', '/register', '/forgot-password'],
      disallow: '/',
    },
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
