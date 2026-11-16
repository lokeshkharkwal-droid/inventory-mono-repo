import { useParams } from 'react-router-dom';
import { RequisitionForm } from '@/features/requisitions/RequisitionForm';

/** Full-page add/edit requisition route (`/requisitions/add`, `/requisitions/edit/:id`). */
export function RequisitionFormPage() {
  const { id } = useParams<{ id: string }>();
  return <RequisitionForm editId={id ?? null} />;
}
