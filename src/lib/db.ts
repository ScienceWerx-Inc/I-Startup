import { sql } from '@vercel/postgres';

/**
 * Vercel Postgres connection + schema bootstrap.
 *
 * Tables are created lazily on first API hit so a fresh Vercel Storage
 * database works without running a separate migration step. For explicit
 * migrations see `db/migrations/001_istartup_reports.sql`.
 */

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
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
