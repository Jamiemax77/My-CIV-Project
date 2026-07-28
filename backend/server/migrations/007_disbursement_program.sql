-- Adds disbursements.program (e.g. "CIV P153") — the admin already picks this in the
-- Input Dana / DisbursementScreen form, but it was never persisted anywhere. Needed so
-- the FASE 4 Voucher Pencairan PDF can show which program a disbursement was for.
-- Run after 006_disbursement_sent_status.sql:
--   mysql -u civ_user -p civ_project < migrations/007_disbursement_program.sql

ALTER TABLE disbursements ADD COLUMN program VARCHAR(50) NULL AFTER title;
