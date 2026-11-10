import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** One field in a field-driven CRUD form. */
export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'tags' | 'bool' | 'date';
  required?: boolean;
  options?: { value: string; label: string }[];
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

/** Shared control styling — matches the Input primitive for a consistent form. */
const CONTROL =
  'flex w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm shadow-xs transition-colors duration-150 placeholder:text-muted-foreground hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Generic field-driven create/edit dialog — the shared form primitive the
 * master-data screens build on, so each resource only declares its fields.
 * Lays fields out in a responsive two-column grid (Site-Admin style) with a
 * scrollable body and a pinned footer so long forms never clip.
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
  const { register, handleSubmit, reset } = useForm<FormShape>({
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (open) reset(initialValues);
  }, [open, initialValues, reset]);

  const submit = handleSubmit((raw) => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const v = raw[f.name];
      if (f.type === 'number') {
        out[f.name] = v === '' || v == null ? undefined : Number(v);
      } else if (f.type === 'tags') {
        out[f.name] = String(v ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (f.type === 'bool') {
        out[f.name] = Boolean(v);
      } else {
        out[f.name] = v === '' ? undefined : v;
      }
    }
    onSubmit(out);
  });

  const spansFull = (f: FieldConfig) =>
    f.fullWidth || f.type === 'textarea' || f.type === 'bool' || f.type === 'tags';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-y-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.name}
                className={cn('space-y-1.5', spansFull(f) && 'sm:col-span-2')}
              >
                <Label htmlFor={f.name}>
                  {f.label}
                  {f.required && <span className="ml-0.5 text-destructive">*</span>}
                </Label>
                {f.type === 'select' ? (
                  <select
                    id={f.name}
                    className={cn(CONTROL, 'h-10')}
                    {...register(f.name, { required: f.required })}
                  >
                    <option value="">—</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'bool' ? (
                  <label className="flex h-10 items-center gap-2.5 rounded-lg border border-input bg-background px-3.5 text-sm shadow-xs">
                    <input
                      id={f.name}
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      {...register(f.name)}
                    />
                    <span className="text-muted-foreground">
                      Active / enabled
                    </span>
                  </label>
                ) : f.type === 'textarea' ? (
                  <textarea
                    id={f.name}
                    rows={3}
                    className={cn(CONTROL, 'min-h-20 resize-y')}
                    {...register(f.name, { required: f.required })}
                  />
                ) : (
                  <Input
                    id={f.name}
                    type={
                      f.type === 'number'
                        ? 'number'
                        : f.type === 'date'
                          ? 'date'
                          : 'text'
                    }
                    step={f.type === 'number' ? 'any' : undefined}
                    placeholder={
                      f.type === 'tags' ? 'Comma-separated values' : undefined
                    }
                    {...register(f.name, { required: f.required })}
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
