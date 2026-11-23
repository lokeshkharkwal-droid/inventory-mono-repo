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
import { useDeleteSale, openSalePdf, type SaleListRow } from './api';
import { SaleDetailModal } from './SaleDetailModal';
import { SalePaymentsModal } from './SalePaymentsModal';
import { AddDeliveryModal } from './AddDeliveryModal';

type ActiveModal = 'details' | 'payments' | 'delivery' | 'email' | null;

/**
 * The sales row "Actions" menu — EZ Health Track parity (controller `Sales`).
 * Items + order mirror the legacy dropdown: Sales Detail, Template Invoice (PDF),
 * View Payments, Add Payment, Add Delivery, Edit Sale, Return Sale (DISABLED —
 * returns aren't surfaced yet), Delete Sale. The legacy inline Print Invoice /
 * Print Receipt / Email actions are folded in below a divider so no capability is
 * lost when the icon buttons are removed.
 *
 * Rendered through a portal pinned to the trigger (fixed position, high z-index),
 * so it floats above the table instead of being clipped by the list's
 * `overflow-hidden` wrapper, and repositions on scroll/resize.
 */
export function SalesActionsMenu({ sale }: { sale: SaleListRow }) {
  const navigate = useNavigate();
  const del = useDeleteSale();
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

  const run = async (fn: () => Promise<void>) => {
    setOpen(false);
    try {
      await fn();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Action failed'));
    }
  };

  const templateInvoice = () =>
    run(async () => {
      await openSalePdf(sale.id);
    });

  const printInvoice = () =>
    run(async () => {
      const ok = await openPrintDocument(`/print/sale/${sale.id}`);
      if (!ok) toast.error('Pop-up blocked — allow pop-ups to print.');
    });

  const printReceipt = () =>
    run(async () => {
      const ok = await openPrintDocument(`/print/sale/${sale.id}/receipt`);
      if (!ok) toast.error('Pop-up blocked — allow pop-ups to print.');
    });

  const remove = () => {
    setOpen(false);
    if (!confirm('Delete this sale?')) return;
    del.mutate(sale.id, {
      onSuccess: () => toast.success('Sale deleted'),
      onError: (err) =>
        toast.error(getApiErrorMessage(err, 'Could not delete sale')),
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
            <MenuItem onClick={() => openModal('details')}>Sales Detail</MenuItem>
            <MenuItem onClick={templateInvoice}>Template Invoice (PDF)</MenuItem>
            <MenuItem onClick={() => openModal('payments')}>
              View Payments
            </MenuItem>
            <MenuItem onClick={() => openModal('payments')}>Add Payment</MenuItem>
            <MenuItem onClick={() => openModal('delivery')}>Add Delivery</MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                navigate(`/sales/edit/${sale.id}`);
              }}
            >
              Edit Sale
            </MenuItem>
            <MenuItem disabled title="Sale returns are not available yet">
              Return Sale
            </MenuItem>
            <Divider />
            <MenuItem onClick={printInvoice}>Print Invoice</MenuItem>
            <MenuItem onClick={printReceipt}>Print Receipt</MenuItem>
            <MenuItem onClick={() => openModal('email')}>Email Invoice</MenuItem>
            <Divider />
            <MenuItem destructive onClick={remove}>
              Delete Sale
            </MenuItem>
          </div>,
          document.body,
        )}

      <SaleDetailModal
        saleId={sale.id}
        saleReference={sale.reference}
        open={modal === 'details'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <SalePaymentsModal
        saleId={sale.id}
        saleReference={sale.reference}
        open={modal === 'payments'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <AddDeliveryModal
        saleId={sale.id}
        saleReference={sale.reference}
        open={modal === 'delivery'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <EmailInvoiceDialog
        saleId={sale.id}
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

/** Email the sale invoice (folded-in legacy Email action) via `POST /print/email`. */
function EmailInvoiceDialog({
  saleId,
  open,
  onOpenChange,
}: {
  saleId: string;
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
        body: { type: 'sale', id: saleId, to: to.trim(), message: message || undefined },
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
          <DialogTitle>Email invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sale-email-to">Recipient email</Label>
            <Input
              id="sale-email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sale-email-msg">Message (optional)</Label>
            <Input
              id="sale-email-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please find your invoice attached."
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
