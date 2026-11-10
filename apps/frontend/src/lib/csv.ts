/**
 * Dependency-free CSV helpers for the import/export pipeline. Parsing handles
 * quoted fields, escaped quotes (`""`), and CR/LF line endings — enough for the
 * spreadsheet exports Excel/Google Sheets produce. Export quotes any field that
 * contains a comma, quote, or newline.
 */

/** Parse CSV text into an array of objects keyed by the header row. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text).filter((r) => r.length > 0 && r.some((c) => c !== ''));
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    header.forEach((key, i) => {
      obj[key] = (cells[i] ?? '').trim();
    });
    return obj;
  });
}

/** Low-level: parse CSV text into a matrix of string cells. */
export function parseCsvRows(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      // Swallow \r\n as a single break.
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      out.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  // Flush the final field/row if the file doesn't end with a newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    out.push(row);
  }
  return out;
}

/** Escape a single CSV cell. */
function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Serialize an array of objects to CSV text. `columns` fixes the header order;
 * when omitted, the keys of the first row are used.
 */
export function toCsv<T extends object>(
  rows: readonly T[],
  columns?: { key: keyof T & string; header: string }[],
): string {
  const cols =
    columns ??
    (rows.length > 0
      ? Object.keys(rows[0]!).map((k) => ({
          key: k as keyof T & string,
          header: k,
        }))
      : []);
  const head = cols.map((c) => csvCell(c.header)).join(',');
  const body = rows
    .map((r) =>
      cols.map((c) => csvCell((r as Record<string, unknown>)[c.key])).join(','),
    )
    .join('\n');
  return body ? `${head}\n${body}` : head;
}

/** Trigger a browser download of `content` as a file. */
export function downloadFile(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Convenience: build CSV from rows and download it. */
export function exportCsv<T extends object>(
  filename: string,
  rows: readonly T[],
  columns?: { key: keyof T & string; header: string }[],
): void {
  downloadFile(filename, toCsv(rows, columns));
}
