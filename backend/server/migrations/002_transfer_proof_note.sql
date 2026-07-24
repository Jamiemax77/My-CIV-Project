-- Run this against an already-deployed database (schema.sql alone won't touch existing tables).
-- Adds a free-text `note` column to transfer_proofs, used for the admin-side "Transaksi Lainnya"
-- flow: a transfer that isn't tied to a scholarship disbursement (e.g. reimbursing transport or
-- consumption costs for a training/Youth Cluster activity). disbursement_id was already nullable,
-- so no change needed there — this migration only adds the column that records what the payment
-- was for when there's no disbursement title to fall back on.

ALTER TABLE transfer_proofs
  ADD COLUMN note VARCHAR(255) NULL AFTER reference_no;
