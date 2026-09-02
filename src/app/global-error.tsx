'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 16,
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          color: '#0a0a0a',
          background: '#ffffff',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ margin: 0, maxWidth: 340, fontSize: 14, color: '#666666' }}>
          The page failed to load. Try again, or refresh.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            appearance: 'none',
            border: 0,
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 500,
            color: '#fafafa',
            background: '#0a0a0a',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
