/**
 * Inline field-level validation message. Renders a small red line beneath a form
 * control when `message` is set, and nothing otherwise. Shared by every form so
 * validation errors look identical across the app (pairs with the `aria-invalid`
 * red-border styling on the Input/select/textarea controls).
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}
