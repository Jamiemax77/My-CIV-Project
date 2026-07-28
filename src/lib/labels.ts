import { MonthlyReportCategory, ReimbursementCategory } from '../types/models';

export const REIMBURSEMENT_CATEGORY_LABEL: Record<ReimbursementCategory, string> = {
  ukt: 'UKT / Kuliah',
  buku: 'Buku',
  alat: 'Alat / Perlengkapan',
  lainnya: 'Lainnya',
};

export const MONTHLY_REPORT_CATEGORY_LABEL: Record<MonthlyReportCategory, string> = {
  kampus: 'Kampus',
  ppa_cluster: 'PPA & Cluster',
  mentoring: 'Mentoring',
};
