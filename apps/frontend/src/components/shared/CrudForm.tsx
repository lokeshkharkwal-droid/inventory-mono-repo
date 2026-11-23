import { useEffect } from 'react';
import { Controller, useForm, type RegisterOptions } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { getApiErrorMessage } from '@/lib/http';
import { applyApiFieldErrors } from '@/lib/form-errors';
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
  /**
   * Receives the typed values (numbers/arrays/booleans coerced per field). May
   * return a promise; if it rejects, the error is mapped onto the relevant field
   * (or shown as a toast fallback) by this form — callers should not swallow it.
   */
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  /** Wrapper/footer styling — `dialog` pins the footer, `page` is inline. */
  variant?: 'dialog' | 'page';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Build react-hook-form validation rules from a field's declarative config. */
function buildRules(f: FieldConfig): RegisterOptions<FormShape> {
  const rules: RegisterOptions<FormShape> = {};
  if (f.required) rules.required = `${f.label} is required`;
  if (f.type === 'number') {
    if (f.min != null) rules.min = { value: f.min, message: `Minimum ${f.min}` };
    if (f.max != null) rules.max = { value: f.max, message: `Maximum ${f.max}` };
  }
  if (f.maxLength != null) {
    rules.maxLength = { value: f.maxLength, message: `Max ${f.maxLength} characters` };
  }
  if (f.pattern) rules.pattern = f.pattern;
  if (f.type === 'email' && !f.pattern) {
    rules.pattern = { value: EMAIL_RE, message: 'Enter a valid email' };
  }
  return rules;
}

/** Shared control styling — matches the Input primitive for a consistent form. */
const CONTROL =
  'flex w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm shadow-xs transition-colors duration-150 placeholder:text-muted-foreground hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30';

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
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<FormShape>({
    defaultValues: initialValues,
    mode: 'onTouched',
  });

  // Re-seed when the incoming values change (e.g. edit record loads).
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const submit = handleSubmit(async (raw) => {
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
    try {
      await onSubmit(out);
    } catch (err) {
      const mapped = applyApiFieldErrors(err, setError, {
        fields: fields.map((f) => f.name),
      });
      if (!mapped) toast.error(getApiErrorMessage(err, 'Could not save'));
    }
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
                aria-invalid={!!errors[f.name]}
                className={cn(CONTROL, 'h-10')}
                {...register(f.name, buildRules(f))}
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
                rules={{ required: f.required ? `${f.label} is required` : false }}
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
                aria-invalid={!!errors[f.name]}
                className={cn(CONTROL, 'min-h-20 resize-y')}
                {...register(f.name, buildRules(f))}
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
                aria-invalid={!!errors[f.name]}
                step={f.type === 'number' ? 'any' : undefined}
                placeholder={
                  f.type === 'tags' ? 'Comma-separated values' : undefined
                }
                {...register(f.name, buildRules(f))}
              />
            )}
            <FieldError message={errors[f.name]?.message as string | undefined} />
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
