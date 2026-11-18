import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ProformaForm, toFormValues } from '@/features/proformas/ProformaForm';
import { useProformaDetail } from '@/features/proformas/api';
import { EzhtSkin } from '@/components/shared/EzhtSkin';

/** Add / Edit Proforma page (EZ Health Track `proformas/add` + `proformas/edit`). */
export function ProformaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const detail = useProformaDetail(id ?? '', isEdit);

  const initialValues = useMemo(() => {
    if (!isEdit || !detail.data) return undefined;
    // Lazily import the mapper by reusing the form's own shape via a light copy.
    return toFormValues(detail.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, detail.data]);

  if (isEdit && detail.isLoading) {
    return (
      <EzhtSkin title="Edit Proforma">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </EzhtSkin>
    );
  }

  return (
    <EzhtSkin title={isEdit ? 'Edit Proforma' : 'Add Proforma'}>
      <ProformaForm
        key={id ?? 'new'}
        proformaId={isEdit ? id : undefined}
        initialValues={initialValues}
        onDone={() => navigate('/proformas')}
      />
    </EzhtSkin>
  );
}
