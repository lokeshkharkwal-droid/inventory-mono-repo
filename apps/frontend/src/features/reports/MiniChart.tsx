/**
 * Tiny dependency-free SVG charts for the reports (the app ships no charting
 * library). `DonutChart` powers the warehouse-stock valuation breakdown;
 * `GroupedBarChart` powers the landing-page monthly sales/purchases trend.
 */

const PALETTE = ['#2563eb', '#16a34a', '#f59e0b', '#db2777', '#7c3aed', '#0891b2'];

interface DonutDatum {
  name: string;
  value: number;
}

/** A donut chart with a legend; slices are proportional to |value|. */
export function DonutChart({
  data,
  formatValue = (v) => v.toLocaleString(),
  size = 200,
}: {
  data: DonutDatum[];
  formatValue?: (v: number) => string;
  size?: number;
}) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const radius = size / 2;
  const inner = radius * 0.6;
  const cx = radius;
  const cy = radius;

  let angle = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const frac = total > 0 ? Math.max(0, d.value) / total : 0;
    const start = angle;
    const end = angle + frac * 2 * Math.PI;
    angle = end;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const ix2 = cx + inner * Math.cos(end);
    const iy2 = cy + inner * Math.sin(end);
    const ix1 = cx + inner * Math.cos(start);
    const iy1 = cy + inner * Math.sin(start);
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`;
    return { path, color: PALETTE[i % PALETTE.length], frac };
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total > 0 ? (
          arcs.map((a, i) => (
            <path key={i} d={a.path} fill={a.color} stroke="#fff" strokeWidth={1} />
          ))
        ) : (
          <circle cx={cx} cy={cy} r={radius} fill="#e5e7eb" />
        )}
        <circle cx={cx} cy={cy} r={inner} fill="#fff" />
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-medium tabular-nums">
              {formatValue(d.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A grouped vertical bar chart with x-axis category labels and a legend. */
export function GroupedBarChart({
  categories,
  series,
  formatValue = (v) => v.toLocaleString(),
  height = 260,
}: {
  categories: string[];
  series: { name: string; data: number[] }[];
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const width = Math.max(categories.length * 64, 320);
  const pad = { top: 16, right: 12, bottom: 44, left: 8 };
  const chartH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...series.flatMap((s) => s.data.map((v) => Math.abs(v))));
  const groupW = (width - pad.left - pad.right) / Math.max(categories.length, 1);
  const barW = Math.max(4, (groupW * 0.7) / Math.max(series.length, 1));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        {series.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="text-muted-foreground">{s.name}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg width={width} height={height}>
          {/* baseline */}
          <line
            x1={pad.left}
            y1={pad.top + chartH}
            x2={width - pad.right}
            y2={pad.top + chartH}
            stroke="#e5e7eb"
          />
          {categories.map((cat, ci) => {
            const gx = pad.left + ci * groupW;
            return (
              <g key={cat}>
                {series.map((s, si) => {
                  const v = Math.abs(s.data[ci] ?? 0);
                  const h = (v / max) * chartH;
                  const x = gx + groupW * 0.15 + si * barW;
                  const y = pad.top + chartH - h;
                  return (
                    <rect
                      key={s.name}
                      x={x}
                      y={y}
                      width={barW - 1}
                      height={h}
                      fill={PALETTE[si % PALETTE.length]}
                      rx={1}
                    >
                      <title>{`${cat} · ${s.name}: ${formatValue(s.data[ci] ?? 0)}`}</title>
                    </rect>
                  );
                })}
                <text
                  x={gx + groupW / 2}
                  y={height - pad.bottom + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#6b7280"
                >
                  {cat}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
