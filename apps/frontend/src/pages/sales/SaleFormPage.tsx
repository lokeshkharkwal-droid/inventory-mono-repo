import { useParams, useSearchParams } from 'react-router-dom';
import { OrderForm } from '@/features/orders/OrderForm';

/** Full-page add/edit sale (routes `/sales/add` and `/sales/edit/:id`). */
export function SaleFormPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  return (
    <OrderForm
      mode="sale"
      editId={id ?? null}
      fromQuoteId={params.get('fromQuote')}
    />
  );
}
