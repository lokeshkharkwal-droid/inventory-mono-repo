import { useParams, useSearchParams } from 'react-router-dom';
import { OrderForm } from '@/features/orders/OrderForm';
import { EzhtSkin } from '@/components/shared/EzhtSkin';

/** Full-page add/edit purchase (routes `/purchases/add` and `/purchases/edit/:id`). */
export function PurchaseFormPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  return (
    <EzhtSkin title={id ? 'Edit Purchase' : 'Add Purchase'} maxWidth={1200}>
      <OrderForm
        mode="purchase"
        editId={id ?? null}
        fromQuoteId={params.get('fromQuote')}
      />
    </EzhtSkin>
  );
}
