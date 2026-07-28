import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import {
  AccountItem,
  AccountKind,
  CommitmentStatement,
  FullSemesterReport,
  KhsUpload,
  MonthlyReport,
  ReimbursementCategory,
  ReimbursementItem,
  ReimbursementType,
  TransferProofItem,
  UserProfile,
} from '../types/models';

function useToken() {
  return useAuthStore((s) => s.token);
}

export function useUpdateProfile() {
  const token = useToken();
  return useMutation({
    mutationFn: (input: { email: string; phone?: string; photoFileId?: string }) =>
      api.patch<{ profile: UserProfile }>('/participant/profile', input, token),
    onSuccess: ({ profile }) => useAuthStore.getState().updateUser(profile),
  });
}

export function useUpdateAcademicInfo() {
  const token = useToken();
  return useMutation({
    mutationFn: (input: { major: string; university: string }) =>
      api.patch<{ profile: UserProfile }>('/participant/academic', input, token),
    onSuccess: ({ profile }) => useAuthStore.getState().updateUser(profile),
  });
}

export function useUpdateNim() {
  const token = useToken();
  return useMutation({
    mutationFn: (nim: string) => api.patch<{ ok: true }>('/participant/nim', { nim }, token),
    onSuccess: (_data, nim) => useAuthStore.getState().updateUser({ nim }),
  });
}

export function useChangePin() {
  const token = useToken();
  return useMutation({
    mutationFn: (input: { currentPin: string; newPin: string }) =>
      api.patch<{ ok: true }>('/participant/pin', input, token),
    onSuccess: () => useAuthStore.getState().updateUser({ mustChangePin: false }),
  });
}

export function useReimbursements() {
  const token = useToken();
  return useQuery({
    queryKey: ['reimbursements'],
    queryFn: () => api.get<ReimbursementItem[]>('/participant/reimbursements', token),
    enabled: !!token,
  });
}

export function useAddReimbursement() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      type: ReimbursementType;
      category: ReimbursementCategory;
      amount: number;
      description: string;
      nomorPengajuan?: string;
      proofFileId?: string;
      proofFileName?: string;
      usageProofFileId?: string;
      usageProofFileName?: string;
    }) => api.post<{ id: string }>('/participant/reimbursements', input, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useFullSemesterReports() {
  const token = useToken();
  return useQuery({
    queryKey: ['fullSemesterReports'],
    queryFn: () => api.get<FullSemesterReport[]>('/participant/full-semester-reports', token),
    enabled: !!token,
  });
}

export function useSubmitFullSemesterReport() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      semesterNumber: number;
      year?: string;
      sks: number;
      ips: number;
      ipk: number;
      coverLetter: string;
      totalAmount: number;
    }) => api.post<{ id: string }>('/participant/full-semester-reports', input, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fullSemesterReports'] }),
  });
}

export function useFinalizeFullSemesterReport() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ ok: true }>(`/participant/full-semester-reports/${id}/submit`, {}, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fullSemesterReports'] }),
  });
}

export function useSaveFullSemesterReportPdf() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fileId }: { id: string; fileId: string }) =>
      api.patch<{ ok: true }>(`/participant/full-semester-reports/${id}/pdf`, { fileId }, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fullSemesterReports'] }),
  });
}

export function useKhsUploads() {
  const token = useToken();
  return useQuery({
    queryKey: ['khsUploads'],
    queryFn: () => api.get<KhsUpload[]>('/participant/khs', token),
    enabled: !!token,
  });
}

export function useUploadKhs() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { semesterNumber: number; fileId: string }) =>
      api.post<{ id: string }>('/participant/khs', input, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['khsUploads'] });
      queryClient.invalidateQueries({ queryKey: ['fullSemesterReports'] });
    },
  });
}

export function useCommitmentStatements() {
  const token = useToken();
  return useQuery({
    queryKey: ['commitmentStatements'],
    queryFn: () => api.get<CommitmentStatement>('/participant/commitment-statements', token),
    enabled: !!token,
  });
}

export function useUploadCommitmentStatement() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { type: 'participant' | 'guardian'; fileId: string }) =>
      api.post<{ ok: true }>('/participant/commitment-statements', input, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commitmentStatements'] });
      queryClient.invalidateQueries({ queryKey: ['fullSemesterReports'] });
    },
  });
}

export function useMonthlyReports() {
  const token = useToken();
  return useQuery({
    queryKey: ['monthlyReports'],
    queryFn: () => api.get<MonthlyReport[]>('/participant/monthly-reports', token),
    enabled: !!token,
  });
}

export function useAddMonthlyReport() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { description: string; reportDate: string; fileId: string }) =>
      api.post<{ id: string }>('/participant/monthly-reports', input, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monthlyReports'] }),
  });
}

export function useUpdateMonthlyReport() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      description: string;
      reportDate: string;
      fileId: string;
    }) => api.patch<{ ok: true }>(`/participant/monthly-reports/${id}`, patch, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monthlyReports'] }),
  });
}

export function useDeleteMonthlyReport() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ ok: true }>(`/participant/monthly-reports/${id}`, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monthlyReports'] }),
  });
}

export function useReportActivityLinks(reportId: string | undefined) {
  const token = useToken();
  return useQuery({
    queryKey: ['reportActivityLinks', reportId],
    queryFn: () =>
      api.get<string[]>(`/participant/full-semester-reports/${reportId}/activity-links`, token),
    enabled: !!token && !!reportId,
  });
}

export function useLinkActivity(reportId: string | undefined) {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (monthlyReportId: string) =>
      api.post<{ ok: true }>(
        `/participant/full-semester-reports/${reportId}/activity-links`,
        { monthlyReportId },
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportActivityLinks', reportId] });
      queryClient.invalidateQueries({ queryKey: ['fullSemesterReports'] });
    },
  });
}

export function useUnlinkActivity(reportId: string | undefined) {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (monthlyReportId: string) =>
      api.delete<{ ok: true }>(
        `/participant/full-semester-reports/${reportId}/activity-links/${monthlyReportId}`,
        token
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportActivityLinks', reportId] });
      queryClient.invalidateQueries({ queryKey: ['fullSemesterReports'] });
    },
  });
}

export function useAccounts() {
  const token = useToken();
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AccountItem[]>('/participant/accounts', token),
    enabled: !!token,
  });
}

export function useAddAccount() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      kind: AccountKind;
      provider: string;
      number: string;
      holderName: string;
    }) => api.post<{ id: string }>('/participant/accounts', input, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      provider: string;
      number: string;
      holderName: string;
    }) => api.patch<{ ok: true }>(`/participant/accounts/${id}`, patch, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/participant/accounts/${id}`, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useTransferProofs() {
  const token = useToken();
  return useQuery({
    queryKey: ['transferProofs'],
    queryFn: () => api.get<TransferProofItem[]>('/participant/transfer-proofs', token),
    enabled: !!token,
  });
}

export function useConfirmTransferProof() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ ok: true }>(`/participant/transfer-proofs/${id}/confirm`, {}, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transferProofs'] }),
  });
}
