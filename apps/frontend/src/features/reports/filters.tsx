import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { getTokenPayload } from '@/lib/http';

/** A labelled filter control for the report filter bar. */
export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? 'w-[160px] space-y-1.5'}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** From/To date-range filter (two native date inputs). */
export function DateRangeFilter({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <>
      <FilterField label="From" className="w-[150px] space-y-1.5">
        <Input type="date" value={from} onChange={(e) => onFrom(e.target.value)} />
      </FilterField>
      <FilterField label="To" className="w-[150px] space-y-1.5">
        <Input type="date" value={to} onChange={(e) => onTo(e.target.value)} />
      </FilterField>
    </>
  );
}

/** A labelled text filter. */
export function TextFilter({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <FilterField label={label}>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FilterField>
  );
}

/** A labelled native-select filter with a leading "all" option. */
export function SelectFilter({
  label,
  value,
  onChange,
  options,
  allLabel = 'All',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  return (
    <FilterField label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </FilterField>
  );
}

/** Warehouse (branch) filter — options come from the JWT's branch profiles. */
export function WarehouseFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const profiles = getTokenPayload()?.profiles ?? [];
  const seen = new Set<string>();
  const branches = profiles
    .filter((p) => p.branch_id && !seen.has(p.branch_id) && seen.add(p.branch_id))
    .map((p) => ({ value: p.branch_id as string, label: p.branch_name ?? p.branch_id! }));
  return (
    <SelectFilter
      label="Warehouse"
      value={value}
      onChange={onChange}
      options={branches}
      allLabel="All Warehouses"
    />
  );
}

/** Year filter (current year back 5 years). */
export function YearFilter({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const current = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => current - i);
  return (
    <FilterField label="Year" className="w-[120px] space-y-1.5">
      <Select value={String(value)} onChange={(e) => onChange(Number(e.target.value))}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </FilterField>
  );
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Month filter (1–12). */
export function MonthFilter({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <FilterField label="Month" className="w-[150px] space-y-1.5">
      <Select value={String(value)} onChange={(e) => onChange(Number(e.target.value))}>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </Select>
    </FilterField>
  );
}

/** Fetch-backed entity filter (combobox) for a list resource. */
export function EntityFilter({
  label,
  value,
  onChange,
  path,
  queryKey,
  getLabel = (r: { name?: string }) => r.name ?? '—',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  path: string;
  queryKey: readonly unknown[];
  getLabel?: (row: { name?: string }) => string;
  placeholder?: string;
}) {
  return (
    <FilterField label={label} className="w-[190px] space-y-1.5">
      <InfiniteSelect
        value={value}
        onChange={onChange}
        path={path}
        queryKey={queryKey}
        getOptionValue={(r) => r.id}
        getOptionLabel={getLabel}
        clearable
        placeholder={placeholder ?? `All ${label.toLowerCase()}`}
      />
    </FilterField>
  );
}

/** Pre-wired entity filters for the common report parties. */
export const CustomerFilter = (p: { value: string; onChange: (v: string) => void }) => (
  <EntityFilter label="Customer" path="/customers" queryKey={['customers']} {...p} />
);
export const SupplierFilter = (p: { value: string; onChange: (v: string) => void }) => (
  <EntityFilter label="Supplier" path="/suppliers" queryKey={['suppliers']} {...p} />
);
export const ProductFilter = (p: { value: string; onChange: (v: string) => void }) => (
  <EntityFilter label="Product" path="/products" queryKey={['products']} {...p} />
);
export const CategoryFilter = (p: { value: string; onChange: (v: string) => void }) => (
  <EntityFilter label="Category" path="/categories" queryKey={['categories']} {...p} />
);
