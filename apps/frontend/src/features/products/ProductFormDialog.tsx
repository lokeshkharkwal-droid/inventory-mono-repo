import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProductForm } from './ProductForm';
import type { ProductDetail } from './api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductDetail | null;
}

/**
 * Modal wrapper around the shared {@link ProductForm}. The dedicated Add Product
 * page ({@link ProductFormPage}) renders the same form full-page; this dialog is
 * kept for inline create/edit from other screens.
 */
export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'New product'}</DialogTitle>
        </DialogHeader>
        {open && (
          <ProductForm
            product={product}
            onSaved={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
