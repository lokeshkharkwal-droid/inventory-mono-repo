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

/**
 * Code 128 symbol patterns, indexed by symbol value 0-106. Each entry is the
 * module-width sequence of its 6 elements (bar, space, bar, space, bar, space),
 * summing to 11 modules; value 106 (stop) has 7 elements / 13 modules. This is
 * the canonical Code 128 encoding table.
 */
const CODE128_PATTERNS: readonly string[] = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
];
const CODE128_START_B = 104;
const CODE128_STOP = 106;

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

  /**
   * Render a Code 128 (code set B) barcode for `value` as an inline SVG string
   * (no deps). Code set B covers printable ASCII 32-126 — the alphanumeric
   * product codes we print. Characters outside that range are dropped. This is
   * the legacy EZ Health Track default symbology.
   */
  code128Svg(value: string, height = 50, moduleWidth = 2): string {
    const clean = value.replace(/[^\x20-\x7e]/g, '');
    // Start B, then one symbol per data char (value = charCode - 32).
    const codes: number[] = [CODE128_START_B];
    for (const ch of clean) codes.push(ch.charCodeAt(0) - 32);
    // Weighted mod-103 checksum (start weight 0, data weights 1..n).
    let sum = CODE128_START_B;
    for (let i = 1; i < codes.length; i++) sum += codes[i]! * i;
    codes.push(sum % 103);
    codes.push(CODE128_STOP);

    const rects: string[] = [];
    let x = 0;
    for (const code of codes) {
      const pattern = CODE128_PATTERNS[code];
      if (!pattern) continue;
      for (let i = 0; i < pattern.length; i++) {
        const w = Number(pattern[i]) * moduleWidth;
        if (i % 2 === 0) {
          // even elements are bars
          rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" />`);
        }
        x += w;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="${height}" fill="#000">${rects.join('')}</svg>`;
  }

  /** Render `value` as a QR code data URL (PNG). */
  async qrDataUrl(value: string): Promise<string> {
    return QRCode.toDataURL(value, { margin: 1, width: 120 });
  }
}
