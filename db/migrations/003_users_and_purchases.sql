-- Founder accounts, purchases (report unlock / course), and the report → user link.
-- Applied automatically on first API hit via ensureAuthTables().

CREATE TABLE IF NOT EXISTS istartup_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  onboarding JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NULL
);

ALTER TABLE istartup_reports ADD COLUMN IF NOT EXISTS user_id UUID NULL;
CREATE INDEX IF NOT EXISTS istartup_reports_user_id_idx
  ON istartup_reports (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS istartup_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES istartup_users(id) ON DELETE CASCADE,
  report_id UUID NULL,
  product TEXT NOT NULL,                 -- 'report' | 'course'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid'
  provider TEXT NOT NULL,                -- 'stripe' | 'mock'
  provider_ref TEXT NULL UNIQUE,         -- Stripe Checkout Session id
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS istartup_purchases_user_idx
  ON istartup_purchases (user_id, status);
