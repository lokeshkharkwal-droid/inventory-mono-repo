import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

interface Props {
  /** The value to encode in the QR code. */
  value: string;
  /** Rendered size in px (default 96). */
  size?: number;
  className?: string;
}

/**
 * QR code rendered as a PNG data URL via the `qrcode` package (the same library
 * the backend uses). Mirrors the QR the legacy purchase/sale modal showed next to
 * the reference barcode. Renders nothing until the data URL resolves / if empty.
 */
export function QrCode({ value, size = 96, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!value) {
      setSrc(null);
      return;
    }
    void QRCode.toDataURL(value, { margin: 1, width: size }).then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) return null;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={`QR code ${value}`}
      className={cn('shrink-0', className)}
    />
  );
}
