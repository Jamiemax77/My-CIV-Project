-- Adds the participant "lupa PIN" request flow: submitted pre-login (by email/NIM),
-- carries 3 selfies for admin manual review before the PIN is actually reset.
-- Run after 003_transfer_proof_method.sql:
--   mysql -u civ_user -p civ_project < migrations/004_pin_reset_requests.sql

CREATE TABLE IF NOT EXISTS pin_reset_requests (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  selfie_front_path VARCHAR(500) NOT NULL,
  selfie_left_path VARCHAR(500) NOT NULL,
  selfie_right_path VARCHAR(500) NOT NULL,
  reviewed_by VARCHAR(40),
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
