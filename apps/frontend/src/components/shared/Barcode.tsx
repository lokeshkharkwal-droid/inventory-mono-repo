import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Code 128 symbol patterns, indexed by symbol value 0-106. Each entry is the
 * module-width run of its elements (bar, space, bar, …). Ported verbatim from the
 * backend `BarcodeService` (`apps/backend/src/modules/printing/barcode.service.ts`)
 * so the on-screen barcode matches the printed labels / legacy EZ Health Track.
 */
const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];
const CODE128_START_B = 104;
const CODE128_STOP = 106;

interface Props {
  /** The value to encode (Code 128 set B — printable ASCII 32-126). */
  value: string;
  /** Bar height in px (default 36). */
  height?: number;
  /** Narrowest module width in px (default 1.4). */
  moduleWidth?: number;
  className?: string;
  /** Show the human-readable value under the bars (default true). */
  showText?: boolean;
}

/** Build the `{ width, rects }` geometry for a Code 128 (set B) barcode. */
function encode(value: string, moduleWidth: number, height: number) {
  const clean = value.replace(/[^\x20-\x7e]/g, '');
  const codes: number[] = [CODE128_START_B];
  for (const ch of clean) codes.push(ch.charCodeAt(0) - 32);
  // Weighted mod-103 checksum (start weight 0, data weights 1..n).
  let sum = CODE128_START_B;
  for (let i = 1; i < codes.length; i++) sum += codes[i]! * i;
  codes.push(sum % 103);
  codes.push(CODE128_STOP);

  const rects: { x: number; w: number }[] = [];
  let x = 0;
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i++) {
      const w = Number(pattern[i]) * moduleWidth;
      if (i % 2 === 0) rects.push({ x, w }); // even elements are bars
      x += w;
    }
  }
  return { width: x, height, rects };
}

/**
 * Inline SVG Code 128 barcode — no dependency, no canvas. Mirrors the reference
 * barcode the legacy purchase/sale modal rendered via `getBarcodeUrl`. Invalid /
 * empty values render nothing.
 */
export function Barcode({
  value,
  height = 36,
  moduleWidth = 1.4,
  className,
  showText = true,
}: Props) {
  const geo = useMemo(
    () => (value ? encode(value, moduleWidth, height) : null),
    [value, moduleWidth, height],
  );
  if (!geo || geo.rects.length === 0) return null;

  return (
    <span className={cn('inline-flex flex-col items-center', className)}>
      <svg
        width={geo.width}
        height={geo.height}
        viewBox={`0 0 ${geo.width} ${geo.height}`}
        fill="#000"
        shapeRendering="crispEdges"
        role="img"
        aria-label={`Barcode ${value}`}
      >
        {geo.rects.map((r, i) => (
          <rect key={i} x={r.x} y={0} width={r.w} height={geo.height} />
        ))}
      </svg>
      {showText && (
        <span className="mt-0.5 font-mono text-[10px] tracking-widest text-foreground">
          {value}
        </span>
      )}
    </span>
  );
}
