-- Dashboard Snapshots: stores one row per day for trend computation
-- Run this migration to create the dashboard_snapshots table

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date)
);

-- Only admins can read/write snapshots
ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage snapshots"
  ON dashboard_snapshots
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Index for fetching recent snapshots (sparkline data)
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_date
  ON dashboard_snapshots (snapshot_date DESC);
