import { sql } from '@vercel/postgres';

/**
 * Vercel Postgres connection + schema bootstrap.
 *
 * Tables are created lazily on first API hit so a fresh Vercel Storage
 * database works without running a separate migration step. For explicit
 * migrations see `db/migrations/001_istartup_reports.sql`.
 */

/**
 * Resolves the Postgres connection string.
 *
 * Vercel names the vars `POSTGRES_URL` when the store is created for the
 * project, but prefixes them (`<store>_POSTGRES_URL`) when connecting an
 * existing Neon store — as with `istartup_postgres_*` here. Accept both.
 */
const CONNECTION_CANDIDATES = [
  'POSTGRES_URL',
  'istartup_postgres_POSTGRES_URL',
  'DATABASE_URL',
  'istartup_postgres_DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'istartup_postgres_POSTGRES_PRISMA_URL',
];

export function connectionString(): string | null {
  for (const key of CONNECTION_CANDIDATES) {
    const value = process.env[key];
    if (value) return value;
  }
  return null;
}

export function isDatabaseConfigured(): boolean {
  return connectionString() !== null;
}

// Point the default @vercel/postgres client at the resolved var so every
// `sql` call site works unchanged regardless of the Vercel prefix.
if (!process.env.POSTGRES_URL) {
  const resolved = connectionString();
  if (resolved) process.env.POSTGRES_URL = resolved;
}

export async function ensureReportsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS istartup_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id TEXT NULL,
      startup_name TEXT NOT NULL DEFAULT '',
      profile JSONB NOT NULL DEFAULT '{}'::jsonb,
      company_info JSONB NULL,
      answers JSONB NOT NULL DEFAULT '{}'::jsonb,
      scores JSONB NOT NULL DEFAULT '[]'::jsonb,
      final_score INTEGER NOT NULL DEFAULT 0,
      band TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS istartup_reports_app_id_idx
      ON istartup_reports (app_id, created_at DESC);
  `;
}
