import { useParams } from 'react-router-dom';
import { ProductDetailView } from '@/features/products/ProductDetailView';

/** Route wrapper for the Product Details page (`/products/view/:id`). */
export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ProductDetailView productId={id} />;
}
