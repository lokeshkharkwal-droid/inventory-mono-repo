import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CrudForm } from '@/components/shared/CrudForm';

/** One field in a field-driven CRUD form. */
export interface FieldConfig {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'number'
    | 'textarea'
    | 'select'
    | 'async-select'
    | 'tags'
    | 'bool'
    | 'date';
  required?: boolean;
  /** Fixed options for a `'select'` field. */
  options?: { value: string; label: string }[];
  /**
   * For `'async-select'`: the searchable, infinitely-scrolling source. `label`
   * on a loaded row is read via `optionLabelKey` (defaults to `name`); the value
   * is always the row `id`.
   */
  async?: {
    queryKey: readonly unknown[];
    path: string;
    optionLabelKey?: string;
    placeholder?: string;
    clearable?: boolean;
  };
  /** Force a field to span the full dialog width (default: textarea/bool do). */
  fullWidth?: boolean;
}

type FormShape = Record<string, string | boolean>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldConfig[];
  /** Current values keyed by field name (strings; arrays joined for `tags`). */
  initialValues: FormShape;
  submitting?: boolean;
  /** Receives the typed values (numbers/arrays/booleans coerced per field). */
  onSubmit: (values: Record<string, unknown>) => void;
}

/**
 * Generic field-driven create/edit dialog — a thin modal wrapper around the
 * shared {@link CrudForm} body, so the dialog and the full-page `EntityFormPage`
 * render identical forms from the same `FieldConfig[]`.
 */
export function CrudFormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initialValues,
  submitting,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-y-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* Remount per open so defaults re-seed even when editing the same row. */}
        <CrudForm
          key={open ? 'open' : 'closed'}
          variant="dialog"
          fields={fields}
          initialValues={initialValues}
          submitting={submitting}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
