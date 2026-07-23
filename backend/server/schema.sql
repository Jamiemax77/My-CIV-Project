-- My CIV-Project database schema (MySQL/MariaDB).
-- Run this once against an empty database created in CloudPanel
-- (Databases -> Add Database), e.g.:
--   mysql -u civ_user -p civ_project < schema.sql

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(40) PRIMARY KEY,
  role ENUM('participant', 'admin') NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  id_number VARCHAR(100) NOT NULL,
  nim VARCHAR(100) NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  gender ENUM('L', 'P'),
  university VARCHAR(255),
  major VARCHAR(255),
  semester INT,
  scholarship_type ENUM('CIV P153', 'CIV Edu', 'BDP Support PPA', 'Lainnya') NULL,
  photo_path VARCHAR(500),
  pin_hash VARCHAR(255) NOT NULL,
  must_change_pin BOOLEAN NOT NULL DEFAULT FALSE,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_profiles_email (email),
  UNIQUE KEY uq_profiles_id_number (id_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scholarships (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL,
  program VARCHAR(255),
  period VARCHAR(50),
  total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  created_by VARCHAR(40),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS disbursements (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL,
  scholarship_id VARCHAR(40),
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  period VARCHAR(50),
  disbursed_at DATE,
  note TEXT,
  status ENUM('draft', 'disbursed') NOT NULL DEFAULT 'disbursed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reimbursements (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL,
  type ENUM('reimburse', 'return') NOT NULL,
  category ENUM('ukt', 'buku', 'alat', 'lainnya') NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  description TEXT,
  proof_path VARCHAR(500),
  proof_name VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by VARCHAR(40),
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL,
  semester VARCHAR(50) NOT NULL,
  gpa DECIMAL(3, 2) NOT NULL,
  file_path VARCHAR(500),
  file_name VARCHAR(255),
  status ENUM('pending', 'verified', 'revision') NOT NULL DEFAULT 'pending',
  reviewed_by VARCHAR(40),
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS full_semester_reports (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL,
  semester_number INT NOT NULL,
  year VARCHAR(20),
  sks INT,
  ips DECIMAL(3, 2),
  ipk DECIMAL(3, 2),
  cover_letter VARCHAR(200),
  total_amount DECIMAL(14, 2),
  file_name VARCHAR(255),
  status ENUM('pending', 'verified', 'revision') NOT NULL DEFAULT 'pending',
  reviewed_by VARCHAR(40),
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE KEY uq_full_report_semester (participant_id, semester_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS khs_uploads (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL,
  semester_number INT NOT NULL,
  file_id VARCHAR(500),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE KEY uq_khs_semester (participant_id, semester_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS commitment_statements (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL UNIQUE,
  participant_stmt_file_id VARCHAR(500),
  guardian_stmt_file_id VARCHAR(500),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- "Laporan Bulanan" — a participant's personal activity log, cumulative, no admin review.
CREATE TABLE IF NOT EXISTS monthly_reports (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL,
  description TEXT,
  report_date DATE,
  file_id VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Links a full_semester_report to the monthly_reports the participant picked as its "Catatan dan Dokumentasi".
CREATE TABLE IF NOT EXISTS report_activity_links (
  id VARCHAR(40) PRIMARY KEY,
  report_id VARCHAR(40) NOT NULL,
  monthly_report_id VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES full_semester_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (monthly_report_id) REFERENCES monthly_reports(id) ON DELETE CASCADE,
  UNIQUE KEY uq_report_activity_link (report_id, monthly_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL,
  kind ENUM('bank', 'ewallet') NOT NULL,
  provider VARCHAR(255) NOT NULL,
  number VARCHAR(100) NOT NULL,
  holder_name VARCHAR(255) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fund_sources (
  id VARCHAR(40) PRIMARY KEY,
  scholarship_type ENUM('CIV P153', 'CIV Edu', 'BDP Support PPA', 'Lainnya') NOT NULL,
  intervention_id VARCHAR(100),
  fund_name VARCHAR(255),
  description VARCHAR(500),
  amount DECIMAL(14, 2) NOT NULL,
  created_by VARCHAR(40),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transfer_proofs (
  id VARCHAR(40) PRIMARY KEY,
  participant_id VARCHAR(40) NOT NULL,
  disbursement_id VARCHAR(40),
  amount DECIMAL(14, 2) NOT NULL,
  sender_bank VARCHAR(255) NOT NULL,
  dest_account VARCHAR(255) NOT NULL,
  transferred_at DATETIME NOT NULL,
  reference_no VARCHAR(100) NOT NULL,
  proof_path VARCHAR(500),
  proof_name VARCHAR(255),
  confirmed_by_participant BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
