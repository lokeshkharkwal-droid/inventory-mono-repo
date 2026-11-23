import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
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
import { openPrintDocument } from '@/lib/print';
import { request, getApiErrorMessage } from '@/lib/http';
import { useDeletePurchase, type PurchaseListRow } from './api';
import { AddPaymentDialog } from './AddPaymentDialog';
import { ViewPaymentsDialog } from './ViewPaymentsDialog';

type ActiveModal = 'payments' | 'addPayment' | 'email' | null;

/**
 * The purchase row "Actions" menu — EZ Health Track parity (controller `Purchases`).
 * Items mirror the legacy dropdown: Purchase Detail, View Payment, Add Payments,
 * Edit, Download PDF, Email, Print Barcode, Return Purchase, Delete. Edit is
 * disabled once the purchase has a return; Delete is disabled when it has payments
 * or a return (the server enforces the same rules).
 *
 * Rendered through a portal pinned to the trigger so it floats above the table
 * instead of being clipped, and repositions on scroll/resize.
 */
export function PurchaseActionsMenu({ purchase }: { purchase: PurchaseListRow }) {
  const navigate = useNavigate();
  const del = useDeletePurchase();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const balance = purchase.grandTotal - purchase.paid;

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

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const downloadPdf = async () => {
    setOpen(false);
    try {
      const ok = await openPrintDocument(`/print/purchase/${purchase.id}`);
      if (!ok) toast.error('Pop-up blocked — allow pop-ups to print.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not open the document'));
    }
  };

  const remove = () => {
    setOpen(false);
    if (!confirm('Delete this purchase?')) return;
    del.mutate(purchase.id, {
      onSuccess: () => toast.success('Purchase deleted'),
      onError: (err) =>
        toast.error(getApiErrorMessage(err, 'Could not delete purchase')),
    });
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
            className="w-56 rounded-md border border-border bg-background py-1 text-left text-sm shadow-lg"
          >
            <MenuItem onClick={() => go(`/purchases/view/${purchase.id}`)}>
              Purchase Detail
            </MenuItem>
            <MenuItem onClick={() => openModal('payments')}>View Payment</MenuItem>
            <MenuItem onClick={() => openModal('addPayment')}>Add Payments</MenuItem>
            <MenuItem
              disabled={purchase.hasReturn}
              title={
                purchase.hasReturn
                  ? 'This purchase has a return and cannot be edited'
                  : undefined
              }
              onClick={() => go(`/purchases/edit/${purchase.id}`)}
            >
              Edit
            </MenuItem>
            <MenuItem onClick={downloadPdf}>Download PDF</MenuItem>
            <MenuItem onClick={() => openModal('email')}>Email</MenuItem>
            <MenuItem
              onClick={() =>
                go(`/products/print-barcodes?purchase=${purchase.id}`)
              }
            >
              Print Barcode
            </MenuItem>
            <MenuItem onClick={() => go(`/purchases/return/${purchase.id}`)}>
              Return Purchase
            </MenuItem>
            <Divider />
            <MenuItem
              destructive
              disabled={purchase.hasPayment || purchase.hasReturn}
              title={
                purchase.hasPayment
                  ? 'This purchase has payments and cannot be deleted'
                  : purchase.hasReturn
                    ? 'This purchase has a return and cannot be deleted'
                    : undefined
              }
              onClick={remove}
            >
              Delete
            </MenuItem>
          </div>,
          document.body,
        )}

      <ViewPaymentsDialog
        purchaseId={purchase.id}
        reference={purchase.reference}
        open={modal === 'payments'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <AddPaymentDialog
        purchaseId={purchase.id}
        reference={purchase.reference}
        balance={balance}
        open={modal === 'addPayment'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <EmailPurchaseDialog
        purchaseId={purchase.id}
        open={modal === 'email'}
        onOpenChange={(o) => !o && setModal(null)}
      />
    </>
  );
}

function Divider() {
  return <div className="my-1 border-t border-border" />;
}

function MenuItem({
  children,
  onClick,
  disabled,
  destructive,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
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
        destructive && 'text-destructive',
        disabled &&
          'cursor-not-allowed text-muted-foreground/50 hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}

/** Email the purchase order (EZHT `Purchases::email`) via `POST /print/email`. */
function EmailPurchaseDialog({
  purchaseId,
  open,
  onOpenChange,
}: {
  purchaseId: string;
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
          type: 'purchase',
          id: purchaseId,
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
          <DialogTitle>Email purchase order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="po-email-to">Recipient email</Label>
            <Input
              id="po-email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="po-email-msg">Message (optional)</Label>
            <Input
              id="po-email-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please find the purchase order attached."
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
