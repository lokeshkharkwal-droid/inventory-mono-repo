import { useNavigate, useParams } from 'react-router-dom';
import { QuoteForm } from '@/features/quotes/QuoteForm';
import { EzhtSkin } from '@/components/shared/EzhtSkin';

/** Dedicated Add / Edit Quote page (EZ Health Track parity). */
export function QuoteFormPage({
  type = 'SALE',
}: {
  type?: 'SALE' | 'PURCHASE';
}) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const verb = id ? 'Edit' : 'Add';
  const title =
    type === 'PURCHASE' ? `${verb} Purchase Quote` : `${verb} Sales Quote`;
  return (
    <EzhtSkin title={title}>
      <QuoteForm
        defaultType={type}
        editId={id ?? null}
        onDone={() =>
          navigate(type === 'PURCHASE' ? '/quotes/purchases' : '/quotes')
        }
      />
    </EzhtSkin>
  );
}
