-- Arıza yaşam döngüsü 6 aşamaya genişletildi + kontrol formu + teknisyen konum alanları.
-- Uygula: psql -d liftonom -f api-net/Migrations/2026_06_28_fault_lifecycle.sql

ALTER TABLE fault_reports
  ADD COLUMN IF NOT EXISTS acknowledged_at     timestamptz,
  ADD COLUMN IF NOT EXISTS inspected_at        timestamptz,
  ADD COLUMN IF NOT EXISTS repair_started_at   timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS fault_diagnosis     text,
  ADD COLUMN IF NOT EXISTS needs_part          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS part_details        text,
  ADD COLUMN IF NOT EXISTS technician_lat      double precision,
  ADD COLUMN IF NOT EXISTS technician_lng      double precision,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- Eski 5-durumlu modeli yeni 6-aşamalı modele taşı
UPDATE fault_reports SET status = CASE status
  WHEN 'new'           THEN 'reported'
  WHEN 'investigating' THEN 'dispatched'
  WHEN 'repairing'     THEN 'repairing'
  WHEN 'resolved'      THEN 'completed'
  WHEN 'closed'        THEN 'completed'
  ELSE status END;

ALTER TABLE fault_reports ALTER COLUMN status SET DEFAULT 'reported';
