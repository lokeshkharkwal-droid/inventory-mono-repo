import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CrudForm } from '@/components/shared/CrudForm';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';

type FormValues = Record<string, string | boolean>;

interface Row {
  id: string;
}

/** The hooks an entity form page consumes (subset of makeCrudHooks). */
export interface EntityFormHooks<T extends Row> {
  useOne: (id: string | undefined) => UseQueryResult<T>;
  useCreate: () => UseMutationResult<unknown, unknown, Record<string, unknown>>;
  useUpdate: () => UseMutationResult<
    unknown,
    unknown,
    { id: string; input: Record<string, unknown> }
  >;
}

interface Props<T extends Row> {
  /** Singular entity name, e.g. "Supplier" (used in titles + toasts). */
  entity: string;
  /** List route to return to after save/cancel, e.g. "/suppliers". */
  basePath: string;
  hooks: EntityFormHooks<T>;
  fields: FieldConfig[];
  /** Blank values for the create form. */
  emptyValues: FormValues;
  /** Map a loaded record to form values for editing. */
  toFormValues: (row: T) => FormValues;
}

/**
 * Full-page create/edit form — the separate "Add X" / "Edit X" route that mirrors
 * the EZ Health Track layout (a dedicated page, not a modal). Reuses the same
 * `FieldConfig[]` and CRUD hooks as the list page's former dialog, so the two
 * never drift. Edit mode is driven by a `:id` route param.
 */
export function EntityFormPage<T extends Row>({
  entity,
  basePath,
  hooks,
  fields,
  emptyValues,
  toFormValues,
}: Props<T>) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const one = hooks.useOne(id);
  const create = hooks.useCreate();
  const update = hooks.useUpdate();

  const initialValues = useMemo(
    () => (isEdit && one.data ? toFormValues(one.data) : emptyValues),
    [isEdit, one.data, toFormValues, emptyValues],
  );

  // Errors propagate to CrudForm, which maps them onto the relevant field (or
  // falls back to a toast); success navigates back to the list.
  const onSubmit = async (values: Record<string, unknown>) => {
    if (isEdit && id) {
      await update.mutateAsync({ id, input: values });
      toast.success(`${entity} updated`);
    } else {
      await create.mutateAsync(values);
      toast.success(`${entity} created`);
    }
    navigate(basePath);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(basePath)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">
          {isEdit ? `Edit ${entity}` : `Add ${entity}`}
        </h1>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        {isEdit && one.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <CrudForm
            // Remount once the edit record arrives so fields seed correctly.
            key={isEdit ? (one.data ? 'loaded' : 'loading') : 'create'}
            variant="page"
            fields={fields}
            initialValues={initialValues}
            submitting={create.isPending || update.isPending}
            submitLabel={isEdit ? 'Update' : 'Create'}
            onCancel={() => navigate(basePath)}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </div>
  );
}
