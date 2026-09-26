/**
 * Admin session helpers (Edge + Node compatible via Web Crypto).
 *
 * Cookie value: `<payload>.<signature>` where payload is base64url of
 * `username:expiryMs` and signature is HMAC-SHA256(payload, secret).
 */

export const ADMIN_COOKIE = 'istartup_admin';
export const SESSION_MAX_AGE_S = 12 * 60 * 60;

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

/** Constant-time string compare to avoid trivial timing leaks. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function adminSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'dev-only-secret'
  );
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

export async function signSession(username: string, secret: string): Promise<string> {
  const payload = b64urlEncode(
    new TextEncoder().encode(`${username}:${Date.now() + SESSION_MAX_AGE_S * 1000}`),
  );
  const sig = b64urlEncode(await hmac(secret, payload));
  return `${payload}.${sig}`;
}

export async function verifySession(
  cookieValue: string | undefined | null,
  secret: string,
): Promise<string | null> {
  if (!cookieValue) return null;
  const [payload, sig] = cookieValue.split('.');
  if (!payload || !sig) return null;
  const expected = b64urlEncode(await hmac(secret, payload));
  if (!safeEqual(sig, expected)) return null;
  try {
    const raw = new TextDecoder().decode(b64urlDecode(payload));
    const sep = raw.lastIndexOf(':');
    const username = raw.slice(0, sep);
    const expiry = Number(raw.slice(sep + 1));
    if (!username || !Number.isFinite(expiry) || Date.now() > expiry) return null;
    return username;
  } catch {
    return null;
  }
}
