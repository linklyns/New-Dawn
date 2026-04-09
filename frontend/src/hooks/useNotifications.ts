import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { NotificationPagedResult } from '../types';

const NOTIFICATIONS_KEY = ['notifications'] as const;

export function useNotifications(page = 1, pageSize = 20, unreadOnly = false) {
  return useQuery<NotificationPagedResult>({
    queryKey: [...NOTIFICATIONS_KEY, page, pageSize, unreadOnly],
    queryFn: () => api.get(`/api/notifications?page=${page}&pageSize=${pageSize}${unreadOnly ? '&unreadOnly=true' : ''}`),
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  return useQuery<NotificationPagedResult, Error, number>({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: () => api.get('/api/notifications?page=1&pageSize=1'),
    refetchInterval: 60_000,
    select: (data) => data.unreadCount,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.put('/api/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useSnoozeNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, months }: { id: number; months: number }) =>
      api.put(`/api/notifications/${id}/snooze?months=${months}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkUnread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/api/notifications/${id}/unread`),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useGenerateNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/notifications/generate'),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}
