import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const KEY = ['notifications'] as const;

export function useNotifications(params: {
  page: number;
  limit: number;
  unreadOnly?: boolean;
}) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<Notification>('GET', '/notifications', {
        query: {
          page: params.page,
          limit: params.limit,
          unreadOnly: params.unreadOnly || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

/** Unread count — polled so the bell badge stays fresh. */
export function useUnreadCount() {
  return useQuery({
    queryKey: [...KEY, 'unread-count'],
    queryFn: () => request<{ count: number }>('GET', '/notifications/unread-count'),
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request('POST', `/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => request('POST', '/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
