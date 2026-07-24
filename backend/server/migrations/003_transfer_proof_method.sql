-- Run this against an already-deployed database (schema.sql alone won't touch existing tables).
-- Adds a `method` column to transfer_proofs so admin can record whether the participant received
-- the money by bank transfer or in person as cash from the treasurer (bendahara). sender_bank/
-- dest_account stay required either way — for 'tunai' the client fills them with fixed
-- placeholder text ("Tunai" / "Diserahkan langsung (Tunai)") rather than asking the admin to type
-- something meaningless, so no NOT NULL relaxation was needed on those columns.

ALTER TABLE transfer_proofs
  ADD COLUMN method ENUM('transfer', 'tunai') NOT NULL DEFAULT 'transfer' AFTER amount;
