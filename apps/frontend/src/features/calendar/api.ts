import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request } from '@/lib/http';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
}

const KEY = ['calendar'] as const;

export function useCalendarEvents(range: { from?: string; to?: string }) {
  return useQuery({
    queryKey: [...KEY, range],
    queryFn: () =>
      request<CalendarEvent[]>('GET', '/calendar/events', {
        query: { from: range.from || undefined, to: range.to || undefined },
      }),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/calendar/events', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/calendar/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
