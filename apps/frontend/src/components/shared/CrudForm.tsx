import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { cn } from '@/lib/utils';
import type { FieldConfig } from '@/components/shared/CrudFormDialog';

type FormShape = Record<string, string | boolean>;

interface Props {
  fields: FieldConfig[];
  /** Current values keyed by field name (strings; arrays joined for `tags`). */
  initialValues: FormShape;
  submitting?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  /** Receives the typed values (numbers/arrays/booleans coerced per field). */
  onSubmit: (values: Record<string, unknown>) => void;
  /** Wrapper/footer styling — `dialog` pins the footer, `page` is inline. */
  variant?: 'dialog' | 'page';
}

/** Shared control styling — matches the Input primitive for a consistent form. */
const CONTROL =
  'flex w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm shadow-xs transition-colors duration-150 placeholder:text-muted-foreground hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50';

const spansFull = (f: FieldConfig) =>
  f.fullWidth || f.type === 'textarea' || f.type === 'bool' || f.type === 'tags';

/**
 * Field-driven create/edit form body — the shared primitive behind both
 * `CrudFormDialog` (modal) and `EntityFormPage` (full page). Lays fields out in a
 * responsive two-column grid with a Cancel/Save footer.
 */
export function CrudForm({
  fields,
  initialValues,
  submitting,
  submitLabel = 'Save',
  onCancel,
  onSubmit,
  variant = 'dialog',
}: Props) {
  const { register, handleSubmit, reset, control } = useForm<FormShape>({
    defaultValues: initialValues,
  });

  // Re-seed when the incoming values change (e.g. edit record loads).
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

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

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2',
          variant === 'dialog' ? 'overflow-y-auto px-6 py-5' : 'py-1',
        )}
      >
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
                required={f.required}
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
            ) : f.type === 'async-select' && f.async ? (
              <Controller
                name={f.name}
                control={control}
                rules={{ required: f.required }}
                render={({ field }) => (
                  <InfiniteSelect
                    id={f.name}
                    value={typeof field.value === 'string' ? field.value : ''}
                    onChange={field.onChange}
                    queryKey={f.async!.queryKey}
                    path={f.async!.path}
                    getOptionValue={(r) => String(r.id ?? '')}
                    getOptionLabel={(r) =>
                      String(r[f.async!.optionLabelKey ?? 'name'] ?? '')
                    }
                    placeholder={f.async!.placeholder}
                    clearable={f.async!.clearable}
                  />
                )}
              />
            ) : f.type === 'bool' ? (
              <label className="flex h-10 items-center gap-2.5 rounded-lg border border-input bg-background px-3.5 text-sm shadow-xs">
                <input
                  id={f.name}
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  {...register(f.name)}
                />
                <span className="text-muted-foreground">Active / enabled</span>
              </label>
            ) : f.type === 'textarea' ? (
              <textarea
                id={f.name}
                rows={3}
                required={f.required}
                className={cn(CONTROL, 'min-h-20 resize-y')}
                {...register(f.name, { required: f.required })}
              />
            ) : (
              <Input
                id={f.name}
                type={
                  f.type === 'number'
                    ? 'number'
                    : f.type === 'email'
                      ? 'email'
                      : f.type === 'date'
                        ? 'date'
                        : 'text'
                }
                required={f.required}
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

      <div
        className={cn(
          'flex justify-end gap-2',
          variant === 'dialog'
            ? 'border-t border-border/60 bg-muted/20 px-6 py-4'
            : 'mt-6 border-t border-border/60 pt-4',
        )}
      >
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
