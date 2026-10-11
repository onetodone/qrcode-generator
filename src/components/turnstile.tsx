'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import type { CaptchaAction } from '@/lib/captcha'
import { FieldError } from '@/components/ui/field'

type TurnstileRenderOptions = {
  sitekey: string
  action: string
  theme: 'light' | 'dark' | 'auto'
  size: 'flexible'
  appearance: 'interaction-only'
  callback: () => void
  'expired-callback': () => void
  'error-callback': () => void
}

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing')))
    script.onerror = () => {
      script.remove()
      scriptPromise = null
      reject(new Error('Turnstile failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Cloudflare Turnstile widget. Placed inside a form, it adds the token as the
 * `cf-turnstile-response` field. Stays invisible unless Cloudflare needs the
 * visitor to interact. A token is single-use, so the widget fetches a fresh
 * one whenever `resetKey` changes (pass the form's action state).
 */
export function Turnstile({
  siteKey,
  action,
  resetKey,
  onReadyChange,
}: {
  siteKey: string
  action: CaptchaAction
  resetKey: unknown
  onReadyChange: (ready: boolean) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onReadyChangeRef = useRef(onReadyChange)
  const initialResetKeyRef = useRef(resetKey)
  const { resolvedTheme } = useTheme()
  const themeRef = useRef(resolvedTheme)
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    onReadyChangeRef.current = onReadyChange
  }, [onReadyChange])

  useEffect(() => {
    let cancelled = false
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: themeRef.current === 'dark' || themeRef.current === 'light' ? themeRef.current : 'auto',
          size: 'flexible',
          appearance: 'interaction-only',
          callback: () => {
            setFailed(false)
            onReadyChangeRef.current(true)
          },
          'expired-callback': () => onReadyChangeRef.current(false),
          'error-callback': () => {
            setFailed(true)
            onReadyChangeRef.current(false)
          },
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current)
      widgetIdRef.current = null
      onReadyChangeRef.current(false)
    }
  }, [siteKey, action])

  // Out of the layout while Turnstile shows nothing, so the empty widget
  // doesn't add a gap to the form.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => setVisible(container.offsetHeight > 0))
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (resetKey === initialResetKeyRef.current) return
    initialResetKeyRef.current = resetKey
    if (!widgetIdRef.current) return
    onReadyChangeRef.current(false)
    window.turnstile?.reset(widgetIdRef.current)
  }, [resetKey])

  return (
    <>
      <div ref={containerRef} className={visible ? undefined : 'absolute'} />
      {failed && <FieldError>Verification couldn&apos;t load. Reload the page and try again.</FieldError>}
    </>
  )
}
