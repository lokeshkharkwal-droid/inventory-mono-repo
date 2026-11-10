import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import type {
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import {
  CrudFormDialog,
  type FieldConfig,
} from '@/components/shared/CrudFormDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { getApiErrorMessage, type PageMeta } from '@/lib/http';
import { exportCsv } from '@/lib/csv';
import type { ListParams } from '@/features/_shared/crud';

/** Optional CSV import config for a master-data page. */
export interface ImportConfig {
  endpoint: string;
  invalidateKey: string;
  templateHeader: string;
  buildRows: (records: Record<string, string>[]) => unknown[];
}

type FormValues = Record<string, string | boolean>;

interface Row {
  id: string;
}

/** The subset of makeCrudHooks this page consumes. */
export interface CrudHooks<T extends Row> {
  useList: (p: ListParams) => UseQueryResult<{ data: T[]; meta: PageMeta }>;
  useCreate: () => UseMutationResult<unknown, unknown, Record<string, unknown>>;
  useUpdate: () => UseMutationResult<
    unknown,
    unknown,
    { id: string; input: Record<string, unknown> }
  >;
  useRemove: () => UseMutationResult<unknown, unknown, string>;
}

interface Props<T extends Row> {
  title: string;
  subtitle?: string;
  newLabel: string;
  hooks: CrudHooks<T>;
  /** Table columns (an edit/delete action column is appended automatically). */
  columns: Column<T>[];
  /** Form fields for create/edit. */
  fields: FieldConfig[];
  /** Blank form values for "create". */
  emptyValues: FormValues;
  /** Map a row to form values for "edit". */
  toFormValues: (row: T) => FormValues;
  /** Human label for the delete-confirm prompt. */
  rowLabel: (row: T) => string;
  /** Extra list query params (e.g. a parent filter). */
  listExtra?: Record<string, string | number | boolean | undefined>;
  /** Extra per-row actions rendered before the edit/delete buttons. */
  rowActions?: (row: T) => ReactNode;
  /** Enable the CSV import button/dialog. */
  importConfig?: ImportConfig;
  /** Columns to export to CSV (defaults to the display columns' keys). */
  exportColumns?: { key: string; header: string }[];
}

const LIMIT = 20;

/**
 * Generic master-data CRUD screen: search + paginated table + field-driven
 * create/edit dialog + delete. Each master-data page is a thin config wrapper.
 */
export function MasterCrudPage<T extends Row>({
  title,
  subtitle,
  newLabel,
  hooks,
  columns,
  fields,
  emptyValues,
  toFormValues,
  rowLabel,
  listExtra,
  rowActions,
  importConfig,
  exportColumns,
}: Props<T>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const { data, isLoading } = hooks.useList({
    page,
    limit: LIMIT,
    search,
    extra: listExtra,
  });
  const create = hooks.useCreate();
  const update = hooks.useUpdate();
  const remove = hooks.useRemove();

  const initialValues = useMemo(
    () => (editing ? toFormValues(editing) : emptyValues),
    [editing, toFormValues, emptyValues],
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (row: T) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const onSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input: values });
        toast.success(`${title} updated`);
      } else {
        await create.mutateAsync(values);
        toast.success(`${title} created`);
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save'));
    }
  };

  const onDelete = async (row: T) => {
    if (!confirm(`Delete "${rowLabel(row)}"?`)) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(`${title} deleted`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete'));
    }
  };

  const onExport = () => {
    const current = data?.data ?? [];
    if (current.length === 0) {
      toast.error('Nothing to export.');
      return;
    }
    const cols =
      exportColumns ?? columns.map((c) => ({ key: c.key, header: c.header }));
    exportCsv(
      `${title.toLowerCase().replace(/\s+/g, '-')}.csv`,
      current as unknown as Record<string, unknown>[],
      cols as { key: string; header: string }[],
    );
  };

  const allColumns: Column<T>[] = [
    ...columns,
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {rowActions?.(r)}
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(r)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
          {importConfig && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {newLabel}
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      <DataTable
        columns={allColumns}
        rows={data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total}
        onPageChange={setPage}
      />

      <CrudFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Edit ${title}` : newLabel}
        fields={fields}
        initialValues={initialValues}
        submitting={create.isPending || update.isPending}
        onSubmit={onSubmit}
      />

      {importConfig && (
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          title={`Import ${title}`}
          endpoint={importConfig.endpoint}
          invalidateKey={importConfig.invalidateKey}
          templateHeader={importConfig.templateHeader}
          buildRows={importConfig.buildRows}
        />
      )}
    </div>
  );
}
