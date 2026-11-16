import { useParams } from 'react-router-dom';
import { OrderForm } from '@/features/orders/OrderForm';
import { EzhtSkin } from '@/components/shared/EzhtSkin';

/** Full-page add/edit purchase (routes `/purchases/add` and `/purchases/edit/:id`). */
export function PurchaseFormPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <EzhtSkin title={id ? 'Edit Purchase' : 'Add Purchase'} maxWidth={1200}>
      <OrderForm mode="purchase" editId={id ?? null} />
    </EzhtSkin>
  );
}
