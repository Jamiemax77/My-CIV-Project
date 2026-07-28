-- Adds the second required proof file to reimbursements (Nota/Kwitansi was already the
-- one proof_path/proof_name field; the new wizard also requires "Bukti barang/jasa/kegiatan
-- yang dibiayai" as a separate upload) plus a client-generated nomor_pengajuan so it persists
-- for real instead of only existing optimistically in the browser right after submit.
-- Run after 007_disbursement_program.sql:
--   mysql -u civ_user -p civ_project < migrations/008_reimbursement_second_proof.sql

ALTER TABLE reimbursements
  ADD COLUMN nomor_pengajuan VARCHAR(30) NULL AFTER id,
  ADD COLUMN usage_proof_path VARCHAR(500) NULL AFTER proof_name,
  ADD COLUMN usage_proof_name VARCHAR(255) NULL AFTER usage_proof_path;
