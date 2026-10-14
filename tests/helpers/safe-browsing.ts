function lengthDelimited(field: number, bytes: Uint8Array): number[] {
  if (bytes.length > 127) throw new Error('Test messages stay under 128 bytes')
  return [(field << 3) | 2, bytes.length, ...bytes]
}

/**
 * Binary `urls:search` response flagging `url` with Safe Browsing threat type
 * codes (1 malware, 2 social engineering); no codes means nothing matched.
 */
export function safeBrowsingResponse(url?: string, threatTypes: number[] = []): Response {
  const body = url
    ? lengthDelimited(
        1,
        new Uint8Array([
          ...lengthDelimited(1, new TextEncoder().encode(url)),
          ...lengthDelimited(2, new Uint8Array(threatTypes)),
        ]),
      )
    : []
  return new Response(new Uint8Array(body), { status: 200 })
}
