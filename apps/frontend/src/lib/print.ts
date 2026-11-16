/**
 * Auth-aware HTML printing. The inventory-backend print endpoints return a
 * self-contained HTML document (wrapped in the `{success,data,meta}` envelope);
 * `request<string>` unwraps it to the raw HTML string. We cannot point a new
 * window straight at the URL because that request would not carry the Bearer
 * token — so we fetch the HTML with the authenticated client and write it into
 * a blank window, then trigger the browser's print dialog.
 */
import { request } from './http';

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
