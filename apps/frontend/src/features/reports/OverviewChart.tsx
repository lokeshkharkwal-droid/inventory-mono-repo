import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OverviewChartMonth } from '@/features/reports/api';
import { fmtMoney } from '@/features/reports/types';

/** One plotted series: the legacy chart's 3 columns + 2 lines. */
const SERIES = [
  { key: 'soldProductTax', name: 'Sold Product Tax', type: 'bar', color: '#2563eb' },
  { key: 'orderTax', name: 'Order Tax', type: 'bar', color: '#16a34a' },
  { key: 'sales', name: 'Sales', type: 'bar', color: '#f59e0b' },
  { key: 'purchases', name: 'Purchases', type: 'line', color: '#db2777' },
  { key: 'purchasedProductTax', name: 'Purchased Product Tax', type: 'line', color: '#7c3aed' },
] as const;

/**
 * Overview "Stock Overview Chart" — a combination bar + line chart replicating the
 * legacy Highcharts chart (`Reports_model::getChartData`): monthly Sold Product
 * Tax, Order Tax and Sales as columns, with Purchases and Purchased Product Tax as
 * lines, over the rolling last 12 months. Click a legend entry to show/hide that
 * series (matching the legacy "click any legend to toggle" behaviour).
 */
export function OverviewChart({ months }: { months: OverviewChartMonth[] }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const toggle = (key: string) =>
    setHidden((h) => ({ ...h, [key]: !h[key] }));

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart data={months} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          width={72}
          tickFormatter={(v: number) => fmtMoney(v)}
        />
        <Tooltip formatter={(value) => fmtMoney(Number(value ?? 0))} />
        <Legend
          onClick={(e) => toggle(String((e as { dataKey?: string }).dataKey))}
          wrapperStyle={{ cursor: 'pointer' }}
        />
        {SERIES.filter((s) => s.type === 'bar').map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            hide={hidden[s.key]}
            radius={[2, 2, 0, 0]}
            maxBarSize={28}
          />
        ))}
        {SERIES.filter((s) => s.type === 'line').map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 2 }}
            hide={hidden[s.key]}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
