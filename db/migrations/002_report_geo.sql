-- Geo columns for iSTARTUP reports (applies to new rows going forward).
-- Applied automatically on first API hit via ensureReportsTable().

ALTER TABLE istartup_reports ADD COLUMN IF NOT EXISTS country TEXT NULL;
ALTER TABLE istartup_reports ADD COLUMN IF NOT EXISTS region TEXT NULL;
ALTER TABLE istartup_reports ADD COLUMN IF NOT EXISTS city TEXT NULL;

CREATE INDEX IF NOT EXISTS istartup_reports_country_idx
  ON istartup_reports (country, created_at DESC);
