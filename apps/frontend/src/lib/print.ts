/**
 * Auth-aware HTML printing. The inventory-backend print endpoints return a
 * self-contained HTML document (wrapped in the `{success,data,meta}` envelope);
 * `request<string>` unwraps it to the raw HTML string. We cannot point a new
 * window straight at the URL because that request would not carry the Bearer
 * token — so we fetch the HTML with the authenticated client and write it into
 * a blank window, then trigger the browser's print dialog.
 */
import { api, request } from './http';

/** Pull a readable message out of a failed blob (PDF) request. */
async function extractBlobErrorMessage(err: unknown): Promise<string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as {
        error?: { message?: string };
      };
      if (parsed.error?.message) return parsed.error.message;
    } catch {
      /* non-JSON body — fall through */
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Could not generate the PDF.';
}

/**
 * Fetch a server-generated PDF (GET, binary) through the authed client and open
 * it in a new tab. Throws a readable error (incl. "no template configured")
 * extracted from the backend's JSON error body, or a popup-blocked message.
 */
export async function openPdfBlob(path: string, label: string): Promise<void> {
  let blob: Blob;
  try {
    const res = await api.request<Blob>({
      method: 'GET',
      url: path,
      responseType: 'blob',
    });
    blob = res.data;
  } catch (err) {
    throw new Error(await extractBlobErrorMessage(err));
  }
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!win) {
    throw new Error(`Pop-up blocked — allow pop-ups to view the ${label}.`);
  }
}

/** Write an HTML document into a new window and fire the print dialog. */
function printHtml(html: string): boolean {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch {
      /* window may have been closed by the user */
    }
  };
  // Print once the document has laid out (images/barcodes). Fall back to a
  // timeout in case `load` already fired before this handler was attached.
  win.onload = triggerPrint;
  setTimeout(triggerPrint, 600);
  return true;
}

/**
 * Fetch a print document from the backend (GET) and open it in a new window,
 * firing the print dialog once it has rendered. Returns false if the popup was
 * blocked.
 */
export async function openPrintDocument(path: string): Promise<boolean> {
  const html = await request<string>('GET', path);
  return printHtml(html);
}

/**
 * Like {@link openPrintDocument} but renders via a POST (for documents built
 * from a request body, e.g. a multi-product barcode sheet).
 */
export async function openPrintDocumentPost(
  path: string,
  body: unknown,
): Promise<boolean> {
  const html = await request<string>('POST', path, { body });
  return printHtml(html);
}

/**
 * Combine several documents of one type into a single multi-page PDF (EZHT
 * "Combine to PDF"). Posts the selected ids to `/print/combine` and prints the
 * merged HTML. `type` ∈ sale|purchase|quote|proforma|requisition|transfer.
 */
export async function openCombinedPdf(
  type: string,
  ids: string[],
): Promise<boolean> {
  return openPrintDocumentPost('/print/combine', { type, ids });
}

/**
 * EZHT "Export to PDF" for a list: render the selected rows as a printable
 * summary table (date / reference / … / total / status) client-side and print.
 */
export function printRowsAsPdf(
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): boolean {
  const esc = (s: unknown) =>
    String(s ?? '').replace(
      /[&<>]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c,
    );
  const thead = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  const html =
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>` +
    `<style>body{font-family:Arial,sans-serif;font-size:12px;padding:16px}` +
    `h2{margin:0 0 12px}table{width:100%;border-collapse:collapse}` +
    `th,td{border:1px solid #999;padding:4px 6px;text-align:left}th{background:#f0f0f0}</style>` +
    `</head><body><h2>${esc(title)}</h2>` +
    `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table></body></html>`;
  return printHtml(html);
}

/**
 * Fetch a print document (POST) and return its raw HTML — for rendering an
 * on-page preview (e.g. in an iframe `srcDoc`) before printing. Unlike
 * {@link openPrintDocumentPost} this does not open a window or print.
 */
export async function fetchPrintHtml(
  path: string,
  body: unknown,
): Promise<string> {
  return request<string>('POST', path, { body });
}

/**
 * Print only the contents of an iframe (its own document), so surrounding page
 * chrome — sidebar, navbar, buttons — is never printed. The iframe must be
 * same-origin (e.g. populated via `srcDoc`).
 */
export function printIframe(iframe: HTMLIFrameElement | null): boolean {
  const win = iframe?.contentWindow;
  if (!win) return false;
  try {
    win.focus();
    win.print();
    return true;
  } catch {
    return false;
  }
}
