import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

/**
 * Standard Code 39 element patterns (B S B S B S B S B; n = narrow, w = wide).
 * Code 39 needs no checksum and is widely scannable — chosen for a dependency-
 * free server-side 1D barcode (no canvas/DOM).
 */
const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '*': 'nwnnwnwnn',
};

/** Barcode + QR generation for print labels/receipts. */
@Injectable()
export class BarcodeService {
  /**
   * Render a Code 39 barcode for `value` as an inline SVG string (no deps).
   * Unsupported characters are dropped. The value is wrapped with the `*`
   * start/stop guards per the Code 39 spec.
   */
  code39Svg(value: string, height = 50, narrow = 2): string {
    const clean = value.toUpperCase().replace(/[^0-9A-Z .-]/g, '');
    const chars = `*${clean}*`.split('');
    const wide = narrow * 3;
    const rects: string[] = [];
    let x = 0;
    for (const ch of chars) {
      const pattern = CODE39[ch];
      if (!pattern) continue;
      for (let i = 0; i < pattern.length; i++) {
        const w = pattern[i] === 'w' ? wide : narrow;
        const isBar = i % 2 === 0; // elements alternate bar/space, starting bar
        if (isBar) {
          rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" />`);
        }
        x += w;
      }
      x += narrow; // inter-character gap
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="${height}" fill="#000">${rects.join('')}</svg>`;
  }

  /** Render `value` as a QR code data URL (PNG). */
  async qrDataUrl(value: string): Promise<string> {
    return QRCode.toDataURL(value, { margin: 1, width: 120 });
  }
}
