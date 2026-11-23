import { useNavigate, useParams } from 'react-router-dom';
import { TransferForm } from '@/features/transfers/TransferForm';
import '@/styles/ezht-form.css';

/** Dedicated Add/Edit Transfer page — legacy EZ Health Track look. */
export function TransferFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  return (
    <div className="ezht-form" style={{ maxWidth: 1000 }}>
      <div className="ezht-modal">
        <div className="ezht-modal-header">
          <h4 className="ezht-modal-title">
            {id ? 'Edit Transfer' : 'Add Transfer'}
          </h4>
        </div>
        <TransferForm editId={id ?? null} onDone={() => navigate('/transfers')} />
      </div>
    </div>
  );
}
