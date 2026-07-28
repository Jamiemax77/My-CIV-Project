-- Closes the gap between the app's Laporan Semester Lengkap and the real paper/PDF format:
--   1) "Rincian Penggunaan Dana" — total_amount is now computed from itemized budget lines
--      (minus kontribusi_ortu) instead of being typed in directly by the participant.
--   2) Target IPK / Tanggal Lulus Kuliah / Tanggal Lulus PPA — filled once on the participant's
--      profile (not per report), since they rarely change and apply to every semester report.
--   3) monthly_reports.category groups "Catatan dan Dokumentasi" into Kampus / PPA & Cluster /
--      Mentoring for the printed report (the minimum-5 rule stays a single combined count).
-- Run after 009_khs_krs_upload.sql:
--   mysql -u civ_user -p civ_project < migrations/010_full_semester_report_extras.sql

ALTER TABLE full_semester_reports
  ADD COLUMN kontribusi_ortu DECIMAL(14, 2) NOT NULL DEFAULT 0 AFTER total_amount;

CREATE TABLE IF NOT EXISTS full_semester_report_budget_items (
  id VARCHAR(40) PRIMARY KEY,
  report_id VARCHAR(40) NOT NULL,
  keterangan VARCHAR(255) NOT NULL,
  unit INT NOT NULL,
  satuan DECIMAL(14, 2) NOT NULL,
  jumlah DECIMAL(14, 2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES full_semester_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE profiles
  ADD COLUMN target_ipk DECIMAL(3, 2) NULL AFTER semester,
  ADD COLUMN target_graduation_date DATE NULL AFTER target_ipk,
  ADD COLUMN ppa_completion_date DATE NULL AFTER target_graduation_date;

ALTER TABLE monthly_reports
  ADD COLUMN category ENUM('kampus', 'ppa_cluster', 'mentoring') NOT NULL DEFAULT 'kampus' AFTER description;
