-- iSTARTUP Score reports (Vercel Postgres).
-- Applied automatically on first API hit via ensureReportsTable(),
-- or run manually with `psql $POSTGRES_URL -f db/migrations/001_istartup_reports.sql`.

CREATE TABLE IF NOT EXISTS istartup_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NULL,
  startup_name TEXT NOT NULL DEFAULT '',
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  company_info JSONB NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_score INTEGER NOT NULL DEFAULT 0 CHECK (final_score >= 0 AND final_score <= 500),
  band TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS istartup_reports_app_id_idx
  ON istartup_reports (app_id, created_at DESC);
