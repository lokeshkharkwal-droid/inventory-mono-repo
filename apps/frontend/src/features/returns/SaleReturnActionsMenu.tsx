import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { request, getApiErrorMessage } from '@/lib/http';
import { openSaleReturnPdf, type SaleReturnRow } from './api';
import { SaleReturnDetailModal } from './SaleReturnDetailModal';
import { SaleReturnPaymentsModal } from './SaleReturnPaymentsModal';

type ActiveModal = 'details' | 'payments' | 'email' | null;

/**
 * The sale-return row "Actions" menu — EZHT parity (controller `Sales`, return
 * dropdown): Sale Detail, View Payment, Add Payment, Download PDF, Email. Rendered
 * through a portal pinned to the trigger so it floats above the table.
 */
export function SaleReturnActionsMenu({ row }: { row: SaleReturnRow }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const toggle = () => {
    if (!open) place();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    const onScrollOrResize = () => place();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  const openModal = (m: Exclude<ActiveModal, null>) => {
    setModal(m);
    setOpen(false);
  };

  const downloadPdf = async () => {
    setOpen(false);
    try {
      await openSaleReturnPdf(row.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not generate the PDF'));
    }
  };

  return (
    <>
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        onClick={toggle}
      >
        Actions <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              zIndex: 1000,
            }}
            className="w-52 rounded-md border border-border bg-background py-1 text-left text-sm shadow-lg"
          >
            <MenuItem onClick={() => openModal('details')}>Sale Detail</MenuItem>
            <MenuItem onClick={() => openModal('payments')}>
              View Payments
            </MenuItem>
            <MenuItem onClick={() => openModal('payments')}>Add Payment</MenuItem>
            <MenuItem onClick={downloadPdf}>Download PDF</MenuItem>
            <MenuItem onClick={() => openModal('email')}>Email</MenuItem>
          </div>,
          document.body,
        )}

      <SaleReturnDetailModal
        returnId={row.id}
        reference={row.reference}
        open={modal === 'details'}
        onOpenChange={(o) => !o && setModal(null)}
        onAddPayment={() => setModal('payments')}
        onEmail={() => setModal('email')}
        onDownloadPdf={downloadPdf}
      />
      <SaleReturnPaymentsModal
        returnId={row.id}
        reference={row.reference}
        open={modal === 'payments'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <EmailReturnDialog
        returnId={row.id}
        open={modal === 'email'}
        onOpenChange={(o) => !o && setModal(null)}
      />
    </>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'block w-full px-3 py-1.5 text-left hover:bg-accent',
        disabled &&
          'cursor-not-allowed text-muted-foreground/50 hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}

/** Email the sale return (EZHT `sales/email` for a return) via `POST /print/email`. */
function EmailReturnDialog({
  returnId,
  open,
  onOpenChange,
}: {
  returnId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!to.trim()) {
      toast.error('Enter a recipient email.');
      return;
    }
    setBusy(true);
    try {
      await request('POST', '/print/email', {
        body: {
          type: 'sale_return',
          id: returnId,
          to: to.trim(),
          message: message || undefined,
        },
      });
      toast.success('Email queued.');
      onOpenChange(false);
      setMessage('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not send the email'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email sale return</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ret-email-to">Recipient email</Label>
            <Input
              id="ret-email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ret-email-msg">Message (optional)</Label>
            <Input
              id="ret-email-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please find your sale return attached."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={send} disabled={busy}>
            {busy ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
