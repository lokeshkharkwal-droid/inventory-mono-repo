import { useParams } from 'react-router-dom';
import { RequisitionForm } from '@/features/requisitions/RequisitionForm';
import { EzhtSkin } from '@/components/shared/EzhtSkin';

/** Full-page add/edit requisition route (`/requisitions/add`, `/requisitions/edit/:id`). */
export function RequisitionFormPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <EzhtSkin title={id ? 'Edit Requisition' : 'Add Requisition'}>
      <RequisitionForm editId={id ?? null} />
    </EzhtSkin>
  );
}
