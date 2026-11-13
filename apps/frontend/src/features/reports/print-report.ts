/**
 * Report export helpers: CSV (via the shared csv lib) and PDF (via the browser's
 * print-to-PDF, mirroring the pattern in `lib/print.ts`). A report page defines
 * its `ReportColumn[]` once and both exporters reuse the column `value`
 * accessors, so CSV and PDF always match what's on screen.
 */
import { downloadFile, toCsv } from '@/lib/csv';
import type { ReportColumn } from './types';

/** Export the given rows to CSV using the columns' `value` accessors. */
export function exportReportCsv<T>(
  filename: string,
  columns: ReportColumn<T>[],
  rows: T[],
): void {
  const flat = rows.map((row) => {
    const o: Record<string, string | number> = {};
    for (const c of columns) o[c.header] = c.value(row);
    return o;
  });
  const csvColumns = columns.map((c) => ({ key: c.header, header: c.header }));
  downloadFile(`${filename}.csv`, toCsv(flat, csvColumns));
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;',
  );

/** Shared print stylesheet + document chrome for every report PDF. */
function wrapDocument(title: string, bodyHtml: string): string {
  const printed = new Date().toLocaleString();
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 24px; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #555; font-size: 12px; margin: 0 0 12px; }
  .meta { margin: 0 0 12px; font-size: 11px; color: #333; }
  .meta span { margin-right: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d0d0d0; padding: 5px 7px; text-align: left; vertical-align: top; }
  thead th { background: #f3f4f6; font-weight: 600; }
  tfoot td { background: #f3f4f6; font-weight: 700; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .foot { margin-top: 14px; color: #888; font-size: 10px; text-align: right; }
  @media print { body { margin: 0; } }
</style></head>
<body>${bodyHtml}<div class="foot">Generated ${esc(printed)}</div></body></html>`;
}

/** Open an HTML document in a new window and fire the print dialog. */
function printHtml(html: string): boolean {
  const win = window.open('', '_blank', 'width=1000,height=1100');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  let printed = false;
  const trigger = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch {
      /* user may have closed the window */
    }
  };
  win.onload = trigger;
  setTimeout(trigger, 500);
  return true;
}

/** Build a header + optional meta line, shared by the table + custom printers. */
function headerHtml(
  title: string,
  subtitle?: string,
  meta?: { label: string; value: string }[],
): string {
  const metaHtml = meta?.length
    ? `<p class="meta">${meta
        .map((m) => `<span><strong>${esc(m.label)}:</strong> ${esc(m.value)}</span>`)
        .join('')}</p>`
    : '';
  const subHtml = subtitle ? `<p class="sub">${esc(subtitle)}</p>` : '';
  return `<h1>${esc(title)}</h1>${subHtml}${metaHtml}`;
}

/** Print a standard column/rows table report as PDF (browser print dialog). */
export function printReport<T>(opts: {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  columns: ReportColumn<T>[];
  rows: T[];
  /** Optional totals row aligned to `columns` (use '' to leave a cell blank). */
  totalsRow?: (string | number)[];
}): boolean {
  const { title, subtitle, meta, columns, rows, totalsRow } = opts;
  const thead = `<tr>${columns
    .map((c) => `<th class="${c.align === 'right' ? 'num' : ''}">${esc(c.header)}</th>`)
    .join('')}</tr>`;
  const tbody = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => `<td class="${c.align === 'right' ? 'num' : ''}">${esc(c.value(r))}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  const tfoot = totalsRow
    ? `<tfoot><tr>${totalsRow
        .map((v, i) => `<td class="${columns[i]?.align === 'right' ? 'num' : ''}">${esc(v)}</td>`)
        .join('')}</tr></tfoot>`
    : '';
  const emptyBody = rows.length
    ? ''
    : `<tr><td colspan="${columns.length}" style="text-align:center;color:#888;padding:16px">No records found.</td></tr>`;
  const body = `${headerHtml(title, subtitle, meta)}<table><thead>${thead}</thead><tbody>${tbody}${emptyBody}</tbody>${tfoot}</table>`;
  return printHtml(wrapDocument(title, body));
}

/** Print a custom report (charts, calendar grids) from caller-built inner HTML. */
export function printReportCustom(
  title: string,
  innerHtml: string,
  subtitle?: string,
  meta?: { label: string; value: string }[],
): boolean {
  return printHtml(
    wrapDocument(title, `${headerHtml(title, subtitle, meta)}${innerHtml}`),
  );
}
