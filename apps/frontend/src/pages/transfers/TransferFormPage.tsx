import { useNavigate } from 'react-router-dom';
import { TransferForm } from '@/features/transfers/TransferForm';
import '@/styles/ezht-form.css';

/** Dedicated Add Transfer page — legacy EZ Health Track look. */
export function TransferFormPage() {
  const navigate = useNavigate();
  return (
    <div className="ezht-form" style={{ maxWidth: 1000 }}>
      <div className="ezht-modal">
        <div className="ezht-modal-header">
          <h4 className="ezht-modal-title">Add Transfer</h4>
        </div>
        <TransferForm onDone={() => navigate('/transfers')} />
      </div>
    </div>
  );
}
