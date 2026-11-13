import { useQuery } from '@tanstack/react-query';
import { request } from '@/lib/http';

/** Query params a report page passes (strings/numbers; empties are stripped). */
export type ReportParams = Record<string, string | number | undefined | null>;

/** Drop empty-string / null / undefined params so they aren't sent to the API. */
export function cleanParams(params: ReportParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

/**
 * Generic report query hook — every migrated report page uses this to fetch its
 * `/reports/*` endpoint with the current filter params. The query key includes
 * the cleaned params so changing a filter refetches.
 */
export function useReport<T>(key: string, path: string, params: ReportParams = {}) {
  const query = cleanParams(params);
  return useQuery({
    queryKey: ['reports', key, query],
    queryFn: () => request<T>('GET', path, { query }),
  });
}
