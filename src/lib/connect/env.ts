import { CONNECT_SCOPES, isConnectApp, type ConnectApp, type ConnectScope } from './types';

/**
 * Connect configuration, all from server env:
 *
 *   CONNECT_KEY      secret. This app's own caller key: `swc_` + 43 base64url characters.
 *   CONNECT_CALLERS  not secret. Who may call this app:
 *                    `name:sha256hex:scope|scope,name:sha256hex:scope`, where sha256hex is
 *                    the lowercase hex SHA-256 of the caller's full key string.
 *   CONNECT_PEERS    not secret. Where peers live: `name=https://base-url,name=https://…`.
 *
 * A malformed entry is skipped (with a warning that never prints a key), so one typo
 * disables one peer, not the whole feature.
 */

export const KEY_SHAPE = /^swc_[A-Za-z0-9_-]{43}$/;

export interface CallerEntry {
  name: string;
  /** The 32-byte SHA-256 of the caller's key. */
  hash: Buffer;
  scopes: ReadonlySet<ConnectScope>;
}

const warn = (message: string) => console.warn(`[connect] ${message}`);

export function parseCallers(raw: string | undefined | null): CallerEntry[] {
  const out: CallerEntry[] = [];
  for (const entry of (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [name, hex, scopeList, ...rest] = entry.split(':');
    if (rest.length || !name || !/^[a-z0-9-]{1,40}$/.test(name)) {
      warn(`CONNECT_CALLERS: skipped a malformed entry`);
      continue;
    }
    if (!hex || !/^[0-9a-f]{64}$/.test(hex)) {
      warn(`CONNECT_CALLERS: skipped "${name}" (the hash must be 64 lowercase hex characters)`);
      continue;
    }
    const scopes = (scopeList ?? '').split('|').map((s) => s.trim()).filter(Boolean);
    const known = scopes.filter((s): s is ConnectScope => (CONNECT_SCOPES as readonly string[]).includes(s));
    if (known.length !== scopes.length || known.length === 0) {
      warn(`CONNECT_CALLERS: skipped "${name}" (scopes must be summary and/or certificates)`);
      continue;
    }
    out.push({ name, hash: Buffer.from(hex, 'hex'), scopes: new Set(known) });
  }
  return out;
}

export function parsePeers(raw: string | undefined | null): Map<ConnectApp, string> {
  const out = new Map<ConnectApp, string>();
  for (const entry of (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const eq = entry.indexOf('=');
    const name = eq > 0 ? entry.slice(0, eq).trim() : '';
    const url = eq > 0 ? entry.slice(eq + 1).trim() : '';
    if (!isConnectApp(name)) {
      warn(`CONNECT_PEERS: skipped an entry for an unknown app`);
      continue;
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      warn(`CONNECT_PEERS: skipped "${name}" (not a URL)`);
      continue;
    }
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && local)) {
      warn(`CONNECT_PEERS: skipped "${name}" (https only, http allowed for localhost)`);
      continue;
    }
    out.set(name, `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`);
  }
  return out;
}

/** This app's caller key, or null when unset or not the `swc_…` shape. */
export function parseConnectKey(raw: string | undefined | null): string | null {
  const key = (raw ?? '').trim();
  if (!key) return null;
  if (!KEY_SHAPE.test(key)) {
    warn('CONNECT_KEY is set but is not swc_ + 43 base64url characters; calling peers is off');
    return null;
  }
  return key;
}

export interface ConnectConfig {
  key: string | null;
  callers: CallerEntry[];
  peers: Map<ConnectApp, string>;
}

let cached: { raw: string; config: ConnectConfig } | null = null;

/** Parsed once per distinct env (so a malformed entry warns once, not on every request). */
export function connectConfig(env: Record<string, string | undefined> = process.env): ConnectConfig {
  const raw = JSON.stringify([env.CONNECT_KEY ?? '', env.CONNECT_CALLERS ?? '', env.CONNECT_PEERS ?? '']);
  if (cached?.raw === raw) return cached.config;
  const config = {
    key: parseConnectKey(env.CONNECT_KEY),
    callers: parseCallers(env.CONNECT_CALLERS),
    peers: parsePeers(env.CONNECT_PEERS),
  };
  cached = { raw, config };
  return config;
}

/** The public origin links in Connect answers point at (this app's own pages). */
export const publicOrigin = (env: Record<string, string | undefined> = process.env) =>
  (env.APP_URL || 'https://istartupscore.com').replace(/\/+$/, '');
