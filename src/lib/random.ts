const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * A random lowercase-alphanumeric string of the given length.
 * `crypto.getRandomValues` is available in the Node, edge, and browser
 * runtimes, so this is safe to call from either the server or the client.
 */
export function randomToken(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')
}
