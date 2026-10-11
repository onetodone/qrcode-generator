function readUrl(name: 'APP_URL' | 'SHORT_LINK_URL'): string | null {
  return process.env[name]?.trim().replace(/\/+$/, '') || null
}

function hostnameOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

/** Public base URL from `APP_URL`, without a trailing slash, for links in emails. Throws when unset. */
export function getAppUrl(): string {
  const url = readUrl('APP_URL')

  if (!url) {
    throw new Error('APP_URL must be set')
  }

  return url
}

/**
 * Base URL for metadata, the sitemap and robots.txt: `APP_URL`, else the
 * Vercel deployment URL, else `localhost` on `PORT`. Never throws, so a build
 * without `APP_URL` still succeeds.
 */
export function getSiteUrl(): string {
  return (
    readUrl('APP_URL') ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT ?? 3000}`)
  )
}

/**
 * Configured base URL for `/s/<hash>` links: `SHORT_LINK_URL`, else `APP_URL`,
 * else null. A printed code keeps this URL for good, so it comes from
 * configuration rather than the host a page was opened at.
 */
export function getConfiguredShortLinkUrl(): string | null {
  return readUrl('SHORT_LINK_URL') ?? readUrl('APP_URL')
}

/** Hostname of `APP_URL`, or null when unset or invalid. */
export function getAppHostname(): string | null {
  return hostnameOf(readUrl('APP_URL'))
}

/** Hostname of `SHORT_LINK_URL`, or null when unset or invalid. */
export function getShortLinkHostname(): string | null {
  return hostnameOf(readUrl('SHORT_LINK_URL'))
}
