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
  // Geo columns (Vercel IP geolocation, captured at submit time).
  await sql`ALTER TABLE istartup_reports ADD COLUMN IF NOT EXISTS country TEXT NULL;`;
  await sql`ALTER TABLE istartup_reports ADD COLUMN IF NOT EXISTS region TEXT NULL;`;
  await sql`ALTER TABLE istartup_reports ADD COLUMN IF NOT EXISTS city TEXT NULL;`;
  await sql`
    CREATE INDEX IF NOT EXISTS istartup_reports_country_idx
      ON istartup_reports (country, created_at DESC);
  `;
}

let authTablesReady: Promise<void> | null = null;

/**
 * Founder accounts, purchases, and the report → user link. Runs its DDL once per server
 * instance (retried on failure). See `db/migrations/003_users_and_purchases.sql`.
 */
export function ensureAuthTables(): Promise<void> {
  authTablesReady ??= (async () => {
    await ensureReportsTable();
    await sql`
      CREATE TABLE IF NOT EXISTS istartup_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL DEFAULT '',
        onboarding JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ NULL
      );
    `;
    await sql`ALTER TABLE istartup_reports ADD COLUMN IF NOT EXISTS user_id UUID NULL;`;
    await sql`
      CREATE INDEX IF NOT EXISTS istartup_reports_user_id_idx
        ON istartup_reports (user_id, created_at DESC);
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS istartup_purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES istartup_users(id) ON DELETE CASCADE,
        report_id UUID NULL,
        product TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        provider TEXT NOT NULL,
        provider_ref TEXT NULL UNIQUE,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'usd',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        paid_at TIMESTAMPTZ NULL
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS istartup_purchases_user_idx
        ON istartup_purchases (user_id, status);
    `;
  })().catch((error) => {
    authTablesReady = null;
    throw error;
  });
  return authTablesReady;
}
