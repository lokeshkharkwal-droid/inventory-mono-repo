import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/http';
import {
  openDeliveryPdf,
  useDeleteDelivery,
  type DeliveryRow,
} from '@/features/returns/api';
import { DeliveryDetailModal } from './DeliveryDetailModal';
import { EditDeliveryModal } from './EditDeliveryModal';

type ActiveModal = 'details' | 'edit' | null;

/**
 * The deliveries row "Actions" menu — EZ Health Track parity (controller `Sales`
 * `getDeliveries`): Delivery Details, Edit Delivery, Download PDF, Delete Delivery.
 * Rendered through a portal pinned to the trigger so it floats above the table.
 */
export function DeliveryActionsMenu({ delivery }: { delivery: DeliveryRow }) {
  const del = useDeleteDelivery();
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
      await openDeliveryPdf(delivery.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not generate the delivery PDF'));
    }
  };

  const remove = () => {
    setOpen(false);
    if (!confirm('Delete this delivery?')) return;
    del.mutate(delivery.id, {
      onSuccess: () => toast.success('Delivery deleted'),
      onError: (err) =>
        toast.error(getApiErrorMessage(err, 'Could not delete delivery')),
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
            style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 1000 }}
            className="w-48 rounded-md border border-border bg-background py-1 text-left text-sm shadow-lg"
          >
            <MenuItem onClick={() => openModal('details')}>
              Delivery Details
            </MenuItem>
            <MenuItem onClick={() => openModal('edit')}>Edit Delivery</MenuItem>
            <MenuItem onClick={downloadPdf}>Download PDF</MenuItem>
            <Divider />
            <MenuItem destructive onClick={remove}>
              Delete Delivery
            </MenuItem>
          </div>,
          document.body,
        )}

      <DeliveryDetailModal
        deliveryId={delivery.id}
        open={modal === 'details'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <EditDeliveryModal
        deliveryId={delivery.id}
        open={modal === 'edit'}
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
  destructive,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block w-full px-3 py-1.5 text-left hover:bg-accent',
        destructive && 'text-destructive',
      )}
    >
      {children}
    </button>
  );
}
