import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ProductDetail } from './api';

interface Props {
  product: ProductDetail | null;
  open: boolean;
  onClose: () => void;
}

/** Lightbox-style modal showing a product's main image + gallery thumbnails. */
export function ViewImageDialog({ product, open, onClose }: Props) {
  const main = product?.imageUrl ?? null;
  const gallery = product?.galleryImageUrls ?? [];

  // All available images (main first, then gallery, de-duplicated).
  const images = [...(main ? [main] : []), ...gallery].filter(
    (url, i, arr) => arr.indexOf(url) === i,
  );

  const [active, setActive] = useState<string | null>(main ?? images[0] ?? null);

  // Reset the active image whenever the product (or main image) changes.
  useEffect(() => {
    setActive(main ?? gallery[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, main]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Image — {product?.name ?? ''}</DialogTitle>
        </DialogHeader>

        {!active ? (
          <div className="flex h-64 items-center justify-center rounded-lg border text-sm text-muted-foreground">
            No image available.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-4">
              <img
                src={active}
                alt={product?.name ?? 'Product image'}
                className="max-h-[60vh] w-auto max-w-full rounded-md object-contain"
              />
            </div>

            {images.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {images.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActive(url)}
                    className={cn(
                      'h-16 w-16 overflow-hidden rounded-md border transition-all',
                      url === active
                        ? 'border-primary ring-2 ring-primary'
                        : 'border-input hover:border-primary/50',
                    )}
                  >
                    <img
                      src={url}
                      alt="Thumbnail"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
