import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { AppNotification } from '../types/models'

function useToken () {
  return useAuthStore(s => s.token)
}

export function useNotifications () {
  const token = useToken()
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<AppNotification[]>('/notifications', token),
    enabled: !!token
  })
}

export function useUnreadNotificationCount () {
  const token = useToken()
  return useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count', token),
    enabled: !!token,
    refetchInterval: 60000
  })
}

export function useMarkNotificationRead () {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: true }>(`/notifications/${id}/read`, {}, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
    }
  })
}

export function useMarkAllNotificationsRead () {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>('/notifications/read-all', {}, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
    }
  })
}

export function useRegisterPushToken () {
  const token = useToken()
  return useMutation({
    mutationFn: (pushToken: string) =>
      api.post<{ ok: true }>('/notifications/push-token', { token: pushToken }, token)
  })
}

export function useClearPushToken () {
  const token = useToken()
  return useMutation({
    mutationFn: () => api.delete<{ ok: true }>('/notifications/push-token', token)
  })
}
