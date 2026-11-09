import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_REDIRECTS = 3;

function isPrivateIPv4(ip) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true;
}

async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only http(s) URLs are allowed');
  }
  if (url.username || url.password) {
    throw new Error('URLs with credentials are not allowed');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error('URL resolves to a private or reserved address');
  }
  return url;
}

/**
 * Fetch a remote image with SSRF protections: http(s) only, no private or
 * reserved IPs (checked on every redirect hop), image/* content type only,
 * size and time limits. Returns { buffer, mimeType }.
 */
export async function fetchPublicImage(rawUrl, { maxBytes = 5 * 1024 * 1024, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = rawUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const url = await assertPublicUrl(current);
      const res = await fetch(url, { redirect: 'manual', signal: controller.signal });

      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        current = new URL(res.headers.get('location'), url).toString();
        continue;
      }
      if (!res.ok) throw new Error(`Image request failed with HTTP ${res.status}`);

      const mimeType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!mimeType.startsWith('image/')) throw new Error('URL does not point to an image');
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > maxBytes) throw new Error('Image is too large');

      const chunks = [];
      let total = 0;
      for await (const chunk of res.body) {
        total += chunk.length;
        if (total > maxBytes) throw new Error('Image is too large');
        chunks.push(chunk);
      }
      return { buffer: Buffer.concat(chunks), mimeType };
    }
    throw new Error('Too many redirects');
  } finally {
    clearTimeout(timer);
  }
}
