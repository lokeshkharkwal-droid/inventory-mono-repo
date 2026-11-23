import type { FormEventHandler, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Plus, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/*
 * kaltros form tokens for the People (party) forms — the same compact 36px
 * rounded-md fields with an indigo focus ring as the Add / Edit Proforma page.
 */
export const FORM_LABEL = 'mb-1.5 block text-xs font-medium text-gray-700';
const FOCUS = 'focus-visible:border-indigo-400 focus-visible:ring-indigo-500/30';
export const FORM_FIELD = `h-9 rounded-md border-gray-200 px-3 text-sm text-gray-800 ${FOCUS}`;
export const FORM_SELECT = `h-9 rounded-md border-gray-200 pl-3 text-sm text-gray-800 ${FOCUS}`;
export const FORM_TEXTAREA = `min-h-[96px] w-full rounded-md border border-gray-200 bg-background px-3 py-2 text-sm text-gray-800 shadow-xs outline-none transition-colors focus-visible:ring-2 ${FOCUS}`;
export const FORM_FIELD_ERROR =
  'border-red-500 hover:border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30';
/** The shared InfiniteSelect trigger, matched to {@link FORM_FIELD}. */
export const FORM_PICKER = [
  '[&>button]:h-9 [&>button]:rounded-md [&>button]:border-gray-200 [&>button]:text-gray-800',
  '[&>button]:shadow-xs [&>button]:transition-colors [&>button:hover]:border-gray-300',
  '[&>button:focus-visible]:border-indigo-400 [&>button:focus-visible]:outline-none',
  '[&>button:focus-visible]:ring-2 [&>button:focus-visible]:ring-indigo-500/30',
].join(' ');
export const FORM_PICKER_ERROR = '[&>button]:border-red-500';
/** kaltros brand gradient (primary action), as on the Proforma pages. */
export const BRAND_BTN =
  'rounded-md bg-[linear-gradient(90deg,#3b82f6_0%,#6366f1_50%,#8b5cf6_100%)] text-white hover:bg-[linear-gradient(90deg,#2563eb_0%,#4f46e5_50%,#7c3aed_100%)]';

/** The EZ Health Track form hint shown above every Add / Edit party form. */
const REQUIRED_HINT =
  'Please fill in the information below. The field labels marked with * are required input fields.';

/** A label + control + inline error, in the kaltros form style. */
export function PartyField({
  label,
  htmlFor,
  required,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  /** Inline validation message (also turns the label context red). */
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <Label htmlFor={htmlFor} className={FORM_LABEL}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface CardProps {
  /** Entity name, e.g. "Supplier" — drives the title and messages. */
  entity: string;
  editing: boolean;
  /** List route to return to (Cancel / not-found back button). */
  backTo: string;
  /** Edit record is loading. */
  loading?: boolean;
  /** Edit record does not exist (bad id / deleted). */
  notFound?: boolean;
  saving?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  /** Submit label on create (defaults to `Add <entity>`). */
  submitLabel?: string;
  children: ReactNode;
}

/**
 * Page card for the People Add / Edit forms (Manufacturer, Supplier, Patient,
 * Customer) in the kaltros style of the Add Proforma page: icon tile + title +
 * the legacy "required fields" hint, the form body, and a Cancel / gradient
 * Submit footer. Also renders the edit-mode loading and not-found states.
 */
export function PartyFormCard({
  entity,
  editing,
  backTo,
  loading,
  notFound,
  saving,
  onSubmit,
  submitLabel,
  children,
}: CardProps) {
  const navigate = useNavigate();
  const Icon = editing ? Pencil : Plus;
  const title = `${editing ? 'Edit' : 'Add'} ${entity}`;

  const header = (
    <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-gray-800">
          {title}
        </h1>
        <p className="text-xs text-gray-500">{REQUIRED_HINT}</p>
      </div>
    </div>
  );

  if (loading || notFound) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {header}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <SearchX className="h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="text-sm text-slate-600">
              This {entity.toLowerCase()} could not be found. It may have been
              deleted.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => navigate(backTo)}
            >
              <ArrowLeft className="h-4 w-4" /> Back to list
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={`${entity} form`}
      className="rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm"
    >
      {header}
      <div className="p-4 sm:p-5">{children}</div>
      <div className="flex flex-wrap justify-end gap-2 rounded-b-xl border-t border-gray-200 bg-white px-4 py-3 sm:px-5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          onClick={() => navigate(backTo)}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" className={BRAND_BTN} loading={saving}>
          {editing ? `Update ${entity}` : (submitLabel ?? `Add ${entity}`)}
        </Button>
      </div>
    </form>
  );
}
