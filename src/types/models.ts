export type Role = 'participant' | 'admin';

export type Gender = 'L' | 'P';

export type ScholarshipType = 'CIV P153' | 'CIV Edu' | 'BDP Support PPA' | 'Lainnya';

export const SCHOLARSHIP_TYPES: ScholarshipType[] = [
  'CIV P153',
  'CIV Edu',
  'BDP Support PPA',
  'Lainnya',
];

export interface UserProfile {
  id: string;
  role: Role;
  fullName: string;
  /** Assigned by admin at creation; used to log in. */
  idNumber: string;
  /** Nomor Induk Mahasiswa — left blank at creation, filled in later by the participant. */
  nim?: string;
  email: string;
  phone?: string;
  gender?: Gender;
  university?: string;
  /** Jurusan / program studi. */
  major?: string;
  semester?: number;
  /** One of SCHOLARSHIP_TYPES; a participant can only ever hold one. */
  scholarshipType?: ScholarshipType;
  photoUrl?: string;
  /** True until the participant replaces the admin-assigned default PIN (000000). */
  mustChangePin?: boolean;
}

export type ReimbursementType = 'reimburse' | 'return';
export type ReimbursementCategory =
  | 'ukt'
  | 'buku'
  | 'alat'
  | 'lainnya';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type ReportStatus = 'pending' | 'verified' | 'revision';
/** `FullSemesterReport`-only status: 'draft' precedes 'pending' while the participant is still assembling attachments. */
export type FullSemesterReportStatus = 'draft' | ReportStatus;

export interface Disbursement {
  id: string;
  participantId: string;
  title: string;
  amount: number;
  disbursedAt: string;
}

export interface ReimbursementItem {
  id: string;
  participantId: string;
  type: ReimbursementType;
  category: ReimbursementCategory;
  amount: number;
  description: string;
  proofFileId?: string;
  proofFileName: string;
  status: ReviewStatus;
  createdAt: string;
  /** Only present on admin-facing list responses (joined server-side). */
  participantName?: string;
  participantIdNumber?: string;
}

export interface ReportItem {
  id: string;
  participantId: string;
  semester: string;
  gpa: number;
  fileId?: string;
  fileName: string;
  status: ReportStatus;
  createdAt: string;
  /** Only present on admin-facing list responses (joined server-side). */
  participantName?: string;
  participantIdNumber?: string;
  participantSemester?: number;
}

export type AccountKind = 'bank' | 'ewallet';

export interface AccountItem {
  id: string;
  participantId: string;
  kind: AccountKind;
  provider: string;
  number: string;
  holderName: string;
  isPrimary: boolean;
}

export type TransferProofMethod = 'transfer' | 'tunai';

export interface TransferProofItem {
  id: string;
  participantId: string;
  /** Absent for "Transaksi Lainnya" — a transfer not tied to a scholarship disbursement. */
  disbursementId?: string;
  /** Only present on the participant's own list response (joined server-side). */
  disbursementTitle?: string;
  amount: number;
  /** 'tunai' — participant picked up the cash in person from the treasurer. */
  method: TransferProofMethod;
  senderBank: string;
  destAccount: string;
  transferredAt: string;
  referenceNo: string;
  /** What the payment was for — required when there's no disbursementId. */
  note?: string;
  proofFileId?: string;
  proofFileName: string;
  confirmedByParticipant: boolean;
}

export interface DashboardDisbursement {
  id: string;
  title: string;
  amount: number;
  disbursedAt: string;
  transferProofId: string | null;
}

export interface DashboardSummary {
  total: number;
  used: number;
  remaining: number;
  approvedCount: number;
  pendingCount: number;
  disbursements: DashboardDisbursement[];
}

export type ParticipantStatus = 'aktif' | 'belum_lapor';

export interface AdminParticipant {
  profile: UserProfile;
  remaining: number;
  status: ParticipantStatus;
}

export interface AdminStats {
  totalDisbursed: number;
  totalParticipants: number;
  activeParticipants: number;
}

/** A funding-source ledger entry (grant/intervention) feeding a scholarship type's pool — entered manually by admin. */
export interface FundSource {
  id: string;
  scholarshipType: ScholarshipType;
  interventionId?: string;
  fundName?: string;
  description?: string;
  amount: number;
  createdAt: string;
}

/** Per-participant rollup: total allocated (disbursements) vs. actually transferred (transfer proofs). */
export interface ParticipantAllocation {
  participantId: string;
  fullName: string;
  idNumber: string;
  total: number;
  received: number;
  remaining: number;
}

export interface FundSummary {
  sources: FundSource[];
  participants: ParticipantAllocation[];
  totals: {
    sources: number;
    received: number;
    remaining: number;
  };
}

/** Computed (not stored) attachment-completion flags for a full semester report. */
export interface SemesterReportChecklist {
  commitment: boolean;
  khs: boolean;
  activities: boolean;
}

/** "Laporan Semester Lengkap" — a richer, separate report submitted per semester (cumulative academic table). */
export interface FullSemesterReport {
  id: string;
  participantId: string;
  semesterNumber: number;
  year?: string;
  sks?: number;
  ips?: number;
  ipk?: number;
  coverLetter?: string;
  totalAmount?: number;
  fileName?: string;
  pdfFileId?: string;
  status: FullSemesterReportStatus;
  createdAt: string;
  /** Only present on admin-facing list responses (joined server-side). */
  participantName?: string;
  participantIdNumber?: string;
  checklist?: SemesterReportChecklist;
  activityCount?: number;
  /** Only present on admin-facing list responses — the actual uploaded files behind the checklist. */
  khsFileId?: string;
  commitmentParticipantFileId?: string;
  commitmentGuardianFileId?: string;
}

/** One semester's KHS upload (Semester I–VIII), cumulative and independent of any single report. */
export interface KhsUpload {
  id: string;
  participantId: string;
  semesterNumber: number;
  fileId?: string;
  uploadedAt: string;
}

/** Uploaded once per participant, ever — never re-uploaded. */
export interface CommitmentStatement {
  participantId: string;
  participantStmtFileId?: string;
  guardianStmtFileId?: string;
}

/** "Laporan Bulanan" — a participant's personal, cumulative activity log. No admin review. */
export interface MonthlyReport {
  id: string;
  participantId: string;
  description?: string;
  reportDate: string;
  fileId?: string;
  createdAt: string;
}
