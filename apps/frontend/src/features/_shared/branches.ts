import { useQuery } from '@tanstack/react-query';
import { request } from '@/lib/http';

export interface BranchOption {
  id: string;
  name: string;
  branchType?: string | null;
}

/**
 * Branch (warehouse) options, fetched from the inventory-backend integration
 * passthrough (which proxies kalnostics-new). Used by transfer branch pickers.
 */
export function useBranchOptions(branchType?: string) {
  return useQuery({
    queryKey: ['branches', branchType ?? 'all'],
    queryFn: () =>
      request<BranchOption[]>('GET', '/integration/branches', {
        query: { branchType: branchType || undefined },
      }),
    staleTime: 5 * 60_000,
  });
}
