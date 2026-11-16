import { useNavigate } from 'react-router-dom';
import { ProformaForm } from '@/features/proformas/ProformaForm';
import { EzhtSkin } from '@/components/shared/EzhtSkin';

/** Dedicated Add Proforma page (EZ Health Track parity). */
export function ProformaFormPage() {
  const navigate = useNavigate();
  return (
    <EzhtSkin title="Add Proforma">
      <ProformaForm onDone={() => navigate('/proformas')} />
    </EzhtSkin>
  );
}
