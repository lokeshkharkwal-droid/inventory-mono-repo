import { useNavigate } from 'react-router-dom';
import { QuoteForm } from '@/features/quotes/QuoteForm';
import { EzhtSkin } from '@/components/shared/EzhtSkin';

/** Dedicated Add Quote page (EZ Health Track parity). */
export function QuoteFormPage({
  type = 'SALE',
}: {
  type?: 'SALE' | 'PURCHASE';
}) {
  const navigate = useNavigate();
  const title = type === 'PURCHASE' ? 'Add Purchase Quote' : 'Add Sales Quote';
  return (
    <EzhtSkin title={title}>
      <QuoteForm defaultType={type} onDone={() => navigate('/quotes')} />
    </EzhtSkin>
  );
}
