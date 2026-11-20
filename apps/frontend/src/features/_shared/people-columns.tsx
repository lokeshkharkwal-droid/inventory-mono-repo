import {
  StatusPill,
  type PeopleColumn,
} from '@/components/shared/PeopleListPage';

/** Status column shared by every People list (pill, sort, Active/Inactive filter). */
export function statusColumn<T extends { isActive: boolean }>(): PeopleColumn<T> {
  return {
    key: 'status',
    header: 'Status',
    value: (r) => (r.isActive ? 'Active' : 'Inactive'),
    render: (r) => <StatusPill active={r.isActive} />,
    sortKey: 'isActive',
    filterKey: 'status',
    filterType: 'status',
  };
}

/** Plain text, or an em dash for empty values. */
export const orDash = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '—' : String(v);

/** `YYYY-MM-DD…` → the local short date, or an em dash. */
export const shortDate = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleDateString() : '—';
