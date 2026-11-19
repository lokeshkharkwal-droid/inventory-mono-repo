import { useMemo, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { ProformaForm, toFormValues } from '@/features/proformas/ProformaForm';
import { useProformaDetail } from '@/features/proformas/api';

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
      <ProformaBox title="Edit Proforma" editing>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </ProformaBox>
    );
  }

  return (
    <ProformaBox
      title={isEdit ? 'Edit Proforma' : 'Add Proforma'}
      editing={isEdit}
    >
      <ProformaForm
        key={id ?? 'new'}
        proformaId={isEdit ? id : undefined}
        initialValues={initialValues}
        onDone={() => navigate('/proformas')}
      />
    </ProformaBox>
  );
}

/**
 * The page card in the kaltros style: a white rounded card whose header has a
 * blue icon tile, the title and a one-line description. No `overflow-hidden`
 * here — it would break the form's sticky totals bar.
 */
function ProformaBox({
  title,
  editing,
  children,
}: {
  title: string;
  editing?: boolean;
  children: ReactNode;
}) {
  const Icon = editing ? Pencil : Plus;
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-gray-800">
            {title}
          </h2>
          <p className="truncate text-xs text-gray-500">
            {editing
              ? 'Update the proforma details, products and note.'
              : 'Add products to the order list and fill in the proforma details.'}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
