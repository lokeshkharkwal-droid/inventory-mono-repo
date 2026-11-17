import { toPng } from 'html-to-image';

/**
 * "Save data as image" — capture a DOM node (a report box or chart) as a PNG and
 * trigger a download. Mirrors the legacy reports' html2canvas "Save as image"
 * button, implemented with the modern `html-to-image` library.
 *
 * @param node the element to capture (e.g. the report shell container).
 * @param filename base filename (no extension); `.png` is appended.
 */
export async function saveElementAsImage(
  node: HTMLElement | null,
  filename: string,
): Promise<void> {
  if (!node) return;
  const dataUrl = await toPng(node, {
    // White background so the exported PNG isn't transparent on dark/card themes.
    backgroundColor: '#ffffff',
    // Render at 2× for a crisper image.
    pixelRatio: 2,
    cacheBust: true,
  });
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}
