import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { NotificationPagedResult } from '../types';

const NOTIFICATIONS_KEY = ['notifications'] as const;

export function useNotifications(page = 1, pageSize = 20) {
  return useQuery<NotificationPagedResult>({
    queryKey: [...NOTIFICATIONS_KEY, page, pageSize],
    queryFn: () => api.get(`/api/notifications?page=${page}&pageSize=${pageSize}`),
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
