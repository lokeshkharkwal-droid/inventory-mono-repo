import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openPrintDocument } from '@/lib/print';
import { getApiErrorMessage } from '@/lib/http';

interface PrintButtonProps {
  /** Backend print path, e.g. `/print/sale/123` or `/print/product/123/label`. */
  path: string;
  /** Button label (icon-only when omitted). */
  children?: ReactNode;
  title?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'icon';
  disabled?: boolean;
}

/**
 * Fetches an HTML print document from the backend with the authenticated client
 * and opens it in a new window for printing (see `lib/print.ts`). Shared across
 * sales invoices/receipts, purchase orders, and product labels.
 */
export function PrintButton({
  path,
  children,
  title = 'Print',
  variant = 'ghost',
  size = 'sm',
  disabled,
}: PrintButtonProps) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const opened = await openPrintDocument(path);
      if (!opened) {
        toast.error('Pop-up blocked — allow pop-ups to print.');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not open the document'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
    >
      <Printer className="h-4 w-4" />
      {children}
    </Button>
  );
}
