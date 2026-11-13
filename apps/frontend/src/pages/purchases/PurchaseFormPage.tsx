import { useParams } from 'react-router-dom';
import { OrderForm } from '@/features/orders/OrderForm';

/** Full-page add/edit purchase (routes `/purchases/add` and `/purchases/edit/:id`). */
export function PurchaseFormPage() {
  const { id } = useParams<{ id: string }>();
  return <OrderForm mode="purchase" editId={id ?? null} />;
}
