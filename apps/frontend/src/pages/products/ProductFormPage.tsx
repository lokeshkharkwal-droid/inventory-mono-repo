import { useNavigate, useParams } from 'react-router-dom';
import { ProductForm } from '@/features/products/ProductForm';
import { useProduct } from '@/features/products/api';
import { EzhtSkin } from '@/components/shared/EzhtSkin';

/**
 * Dedicated full-page Add / Edit Product screen (EZHT `products/add` &
 * `products/edit/:id`). Renders the shared {@link ProductForm} in the legacy
 * EZ Health Track skin; in edit mode it loads the product first. On save (or
 * cancel) it returns to the product list.
 */
export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { data: product, isLoading } = useProduct(id ?? null);

  const back = () => navigate('/products');

  return (
    <EzhtSkin title={isEdit ? 'Edit Product' : 'Add Product'} maxWidth={1100}>
      {isEdit && isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ProductForm
          product={isEdit ? (product ?? null) : null}
          onSaved={back}
          onCancel={back}
        />
      )}
    </EzhtSkin>
  );
}
