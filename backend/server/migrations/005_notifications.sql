-- Adds the in-app notification center + push-token storage for the tiered
-- notification system (in-app always, push only for pin_reset_requested/reviewed).
-- Run after 004_pin_reset_requests.sql:
--   mysql -u civ_user -p civ_project < migrations/005_notifications.sql

ALTER TABLE profiles ADD COLUMN push_token VARCHAR(255) NULL AFTER locked_until;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(40) PRIMARY KEY,
  profile_id VARCHAR(40) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body VARCHAR(500),
  data JSON,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
