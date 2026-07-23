import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { DashboardSummary } from '../types/models';

export function useDashboard() {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => api.get<DashboardSummary>('/participant/dashboard', token),
    enabled: !!token,
  });
}
