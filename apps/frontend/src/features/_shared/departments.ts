import { useQuery } from '@tanstack/react-query';
import { request } from '@/lib/http';

export interface DepartmentOption {
  id: string;
  name: string;
  shortName?: string | null;
  code?: string | null;
}

/**
 * Active tenant department options, fetched from the inventory-backend
 * integration passthrough (which proxies kalnostics-new). Departments are
 * tenant-wide (not branch-scoped), so the list is the same for every branch.
 * Used by the requisition From/To Department pickers.
 */
export function useDepartmentOptions() {
  return useQuery({
    queryKey: ['departments', 'options'],
    queryFn: () =>
      request<DepartmentOption[]>('GET', '/integration/departments'),
    staleTime: 5 * 60_000,
  });
}
