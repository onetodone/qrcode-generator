// Preloaded with `node --import` when self-hosting. Next.js keeps a client-sent `X-Forwarded-For` as is and
// only fills it from the socket when it's missing, so with the port exposed directly anyone could pick the IP
// the rate limits key on. Forwarded headers are kept only from a trusted peer (a reverse proxy); otherwise
// `X-Forwarded-For` is replaced with the socket address.
//
// TRUSTED_PROXY: `private` (default) trusts loopback and private-network peers, `all` trusts every peer
// (a proxy on a public address, such as a CDN in front of the origin), `none` trusts no peer.

import http from 'node:http'
import net from 'node:net'

const privateRanges = new net.BlockList()
for (const [address, prefix] of [
  ['127.0.0.0', 8],
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['169.254.0.0', 16],
]) {
  privateRanges.addSubnet(address, prefix, 'ipv4')
}
for (const [address, prefix] of [
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
]) {
  privateRanges.addSubnet(address, prefix, 'ipv6')
}

const mode = (process.env.TRUSTED_PROXY || 'private').trim().toLowerCase()
if (!['private', 'all', 'none'].includes(mode)) {
  throw new Error(`TRUSTED_PROXY must be "private", "all" or "none", got "${process.env.TRUSTED_PROXY}".`)
}

function socketAddress(socket) {
  const address = socket.remoteAddress ?? ''
  return address.startsWith('::ffff:') && net.isIPv4(address.slice(7)) ? address.slice(7) : address
}

function isTrustedPeer(address) {
  if (mode === 'all') return true
  if (mode === 'none' || !address) return false
  return privateRanges.check(address, net.isIPv4(address) ? 'ipv4' : 'ipv6')
}

if (mode !== 'all') {
  const createServer = http.createServer
  http.createServer = function (...args) {
    const server = createServer.apply(this, args)
    server.prependListener('request', (req) => {
      const address = socketAddress(req.socket)
      if (isTrustedPeer(address)) return
      delete req.headers['x-real-ip']
      if (address) req.headers['x-forwarded-for'] = address
      else delete req.headers['x-forwarded-for']
    })
    return server
  }
}
