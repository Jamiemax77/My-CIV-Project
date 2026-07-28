-- Extends disbursements.status with 'sent', the third stage of the unified
-- pencairan flow: draft -> disbursed -> sent (bukti transfer terkirim).
-- Run after 005_notifications.sql:
--   mysql -u civ_user -p civ_project < migrations/006_disbursement_sent_status.sql

ALTER TABLE disbursements MODIFY status ENUM('draft', 'disbursed', 'sent') NOT NULL DEFAULT 'disbursed';
