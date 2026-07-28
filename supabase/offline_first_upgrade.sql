-- Offline-First Mode: Prerequisites
-- Run this in Supabase SQL Editor before deploying offline-first features

-- 1. Auto-update triggers for conflict detection
--    students, grades, payments have updated_at columns but NO triggers
--    Without these, updated_at never changes after INSERT, breaking conflict detection

CREATE TRIGGER tr_students_updated BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_grades_updated BEFORE UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_payments_updated BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Idempotency columns for deduplication on sync replay
--    Each offline mutation gets a client-generated UUID
--    On replay, the server deduplicates via these unique indexes

ALTER TABLE students ADD COLUMN IF NOT EXISTS client_request_id uuid;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS client_request_id uuid;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_client_req
  ON students(client_request_id) WHERE client_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_grades_client_req
  ON grades(client_request_id) WHERE client_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_client_req
  ON payments(client_request_id) WHERE client_request_id IS NOT NULL;
