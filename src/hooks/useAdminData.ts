import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import {
  AdminParticipant,
  AdminStats,
  Disbursement,
  DisbursementStatus,
  AccountItem,
  FullSemesterReport,
  FundSummary,
  KhsUpload,
  MonthlyReport,
  PinResetRequest,
  PinResetRequestStatus,
  ReimbursementItem,
  ReportItem,
  ReviewStatus,
  ReportStatus,
  ScholarshipType,
  TransferProofMethod,
  UserProfile,
} from '../types/models';

function useToken() {
  return useAuthStore((s) => s.token);
}

export function useUpdateAdminProfile() {
  const token = useToken();
  return useMutation({
    mutationFn: (input: {
      fullName: string;
      idNumber: string;
      email: string;
      phone?: string;
      photoFileId?: string;
    }) => api.patch<{ profile: UserProfile }>('/admin/profile', input, token),
    onSuccess: ({ profile }) => useAuthStore.getState().updateUser(profile),
  });
}

export function useAdminParticipants() {
  const token = useToken();
  return useQuery({
    queryKey: ['adminParticipants'],
    queryFn: () => api.get<AdminParticipant[]>('/admin/participants', token),
    enabled: !!token,
  });
}

export function useAddParticipant() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      fullName: string;
      idNumber: string;
      nim?: string;
      email: string;
      phone?: string;
      gender?: 'L' | 'P';
      university?: string;
      major?: string;
      semester?: number;
      scholarshipType?: ScholarshipType;
    }) => api.post<{ id: string }>('/admin/participants', input, token),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['adminParticipants'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['adminStats'] }),
      ]),
  });
}

export function useSetScholarshipType() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scholarshipType }: { id: string; scholarshipType: ScholarshipType }) =>
      api.patch<{ ok: true }>(
        `/admin/participants/${id}/scholarship-type`,
        { scholarshipType },
        token
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminParticipants'] }),
  });
}

export function useParticipantPinResetRequests(participantId: string | undefined) {
  const token = useToken();
  return useQuery({
    queryKey: ['participantPinResetRequests', participantId],
    queryFn: () =>
      api.get<PinResetRequest[]>(`/admin/participants/${participantId}/pin-reset-requests`, token),
    enabled: !!token && !!participantId,
  });
}

export function useReviewPinResetRequest() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PinResetRequestStatus }) =>
      api.post<{ ok: true }>(`/admin/pin-reset-requests/${id}/review`, { status }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participantPinResetRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminParticipants'] });
    },
  });
}

export function useFundSummary() {
  const token = useToken();
  return useQuery({
    queryKey: ['fundSummary'],
    queryFn: () => api.get<FundSummary>('/admin/fund-summary', token),
    enabled: !!token,
  });
}

export function useAddFundSource() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      scholarshipType: ScholarshipType;
      interventionId?: string;
      fundName?: string;
      description?: string;
      amount: number;
    }) => api.post<{ id: string }>('/admin/fund-sources', input, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fundSummary'] }),
  });
}

export function useAdminStats() {
  const token = useToken();
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.get<AdminStats>('/admin/stats', token),
    enabled: !!token,
  });
}

export function useParticipantDisbursements(
  participantId: string | undefined,
  options?: { needsProof?: boolean }
) {
  const token = useToken();
  const needsProof = options?.needsProof ?? false;
  return useQuery({
    queryKey: ['participantDisbursements', participantId, needsProof],
    queryFn: () =>
      api.get<Disbursement[]>(
        `/admin/participants/${participantId}/disbursements${needsProof ? '?needsProof=1' : ''}`,
        token
      ),
    enabled: !!token && !!participantId,
  });
}

export function useParticipantAccounts(participantId: string | undefined) {
  const token = useToken();
  return useQuery({
    queryKey: ['participantAccounts', participantId],
    queryFn: () => api.get<AccountItem[]>(`/admin/participants/${participantId}/accounts`, token),
    enabled: !!token && !!participantId,
  });
}

export function useParticipantMonthlyReports(participantId: string | undefined) {
  const token = useToken();
  return useQuery({
    queryKey: ['participantMonthlyReports', participantId],
    queryFn: () =>
      api.get<MonthlyReport[]>(`/admin/participants/${participantId}/monthly-reports`, token),
    enabled: !!token && !!participantId,
  });
}

/** Full semester-report history (all semesters) for one participant — for the combined PDF's
 * IPS/IPK table + chart. Distinct from useAdminFullSemesterReports, which is the flat
 * cross-participant list backing the Verifikasi screen. */
export function useParticipantFullSemesterReports(participantId: string | undefined) {
  const token = useToken();
  return useQuery({
    queryKey: ['participantFullSemesterReports', participantId],
    queryFn: () =>
      api.get<FullSemesterReport[]>(
        `/admin/participants/${participantId}/full-semester-reports`,
        token
      ),
    enabled: !!token && !!participantId,
  });
}

/** Every KHS/KRS upload (all semesters) for one participant — for the combined PDF's Lembar 4+. */
export function useParticipantKhsUploads(participantId: string | undefined) {
  const token = useToken();
  return useQuery({
    queryKey: ['participantKhsUploads', participantId],
    queryFn: () => api.get<KhsUpload[]>(`/admin/participants/${participantId}/khs`, token),
    enabled: !!token && !!participantId,
  });
}

export function useAddDisbursement() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      participantId: string;
      title: string;
      program?: string;
      amount: number;
      period?: string;
      disbursedAt?: string;
      note?: string;
      status?: Extract<DisbursementStatus, 'draft' | 'disbursed'>;
    }) => api.post<{ id: string }>('/admin/disbursements', input, token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminParticipants'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      // fund-summary sums each participant's disbursements too (their "Total"/"Sisa Dana" on
      // FundAllocationScreen) — not just the totals a new transfer proof would touch.
      queryClient.invalidateQueries({ queryKey: ['fundSummary'] });
      queryClient.invalidateQueries({
        queryKey: ['participantDisbursements', variables.participantId],
      });
    },
  });
}

export function useAdminReimbursements() {
  const token = useToken();
  return useQuery({
    queryKey: ['adminReimbursements'],
    queryFn: () => api.get<ReimbursementItem[]>('/admin/reimbursements', token),
    enabled: !!token,
  });
}

export function useReviewReimbursement() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) =>
      api.post<{ ok: true }>(`/admin/reimbursements/${id}/review`, { status }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['adminParticipants'] });
    },
  });
}

export function useAdminReports() {
  const token = useToken();
  return useQuery({
    queryKey: ['adminReports'],
    queryFn: () => api.get<ReportItem[]>('/admin/reports', token),
    enabled: !!token,
  });
}

export function useReviewReport() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) =>
      api.post<{ ok: true }>(`/admin/reports/${id}/review`, { status }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['adminParticipants'] });
    },
  });
}

export function useAdminFullSemesterReports() {
  const token = useToken();
  return useQuery({
    queryKey: ['adminFullSemesterReports'],
    queryFn: () => api.get<FullSemesterReport[]>('/admin/full-semester-reports', token),
    enabled: !!token,
  });
}

export function useAdminFullSemesterReportActivities(reportId: string | undefined) {
  const token = useToken();
  return useQuery({
    queryKey: ['adminFullSemesterReportActivities', reportId],
    queryFn: () =>
      api.get<MonthlyReport[]>(`/admin/full-semester-reports/${reportId}/activities`, token),
    enabled: !!token && !!reportId,
  });
}

export function useReviewFullSemesterReport() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) =>
      api.post<{ ok: true }>(`/admin/full-semester-reports/${id}/review`, { status }, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminFullSemesterReports'] }),
  });
}

export function useAddTransferProof() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      participantId: string;
      disbursementId?: string;
      amount: number;
      method: TransferProofMethod;
      senderBank: string;
      destAccount: string;
      transferredAt?: string;
      referenceNo: string;
      note?: string;
      proofFileId?: string;
      proofFileName?: string;
    }) => api.post<{ id: string }>('/admin/transfer-proofs', input, token),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminParticipants'] });
      queryClient.invalidateQueries({ queryKey: ['fundSummary'] });
      queryClient.invalidateQueries({
        queryKey: ['participantDisbursements', variables.participantId],
      });
    },
  });
}
