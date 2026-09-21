import type { MetadataRoute } from 'next'

const appUrl =
  process.env.APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  `http://localhost:${process.env.PORT ?? 3000}`

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${appUrl}/login`,
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/register`,
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/forgot-password`,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]
}
