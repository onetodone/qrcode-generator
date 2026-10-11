import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/app-url'

const appUrl = getSiteUrl()

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${appUrl}/`,
      changeFrequency: 'monthly',
      priority: 1,
    },
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
    {
      url: `${appUrl}/terms-of-use`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${appUrl}/privacy-policy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
