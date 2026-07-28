-- Adds a KRS slot alongside the existing KHS upload per semester — "Unggah KHS" becomes
-- "Unggah KHS/KRS" with two independent upload buttons per semester instead of one.
-- khs_uploads.file_id keeps representing KHS (untouched, no rename to avoid churn);
-- krs_file_id is the new, independently-updatable KRS file.
-- Run after 008_reimbursement_second_proof.sql:
--   mysql -u civ_user -p civ_project < migrations/009_khs_krs_upload.sql

ALTER TABLE khs_uploads ADD COLUMN krs_file_id VARCHAR(500) NULL AFTER file_id;
