-- Run this against an already-deployed database (schema.sql alone won't touch existing tables).
-- Adds the 'draft' status used while a participant is still assembling a Laporan Semester Lengkap
-- (base academic form + KHS/pernyataan uploads + >=5 linked activities) before finalizing it for
-- admin review, and a pdf_file_id column to store the generated PDF report.

ALTER TABLE full_semester_reports
  MODIFY status ENUM('draft', 'pending', 'verified', 'revision') NOT NULL DEFAULT 'draft';

ALTER TABLE full_semester_reports
  ADD COLUMN pdf_file_id VARCHAR(500) NULL AFTER file_name;
