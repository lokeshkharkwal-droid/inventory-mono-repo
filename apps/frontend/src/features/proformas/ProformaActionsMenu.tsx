import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProformaListRow } from './api';
import { LabTestMappingModal } from './LabTestMappingModal';
import { BranchMappingModal } from './BranchMappingModal';
import { ProformaDetailModal } from './ProformaDetailModal';

type ActiveModal = 'details' | 'labTest' | 'branch' | null;

/**
 * The proforma row "Actions" menu — EZ Health Track parity (controller
 * `Proformas::getProformas`). Items + order match the legacy dropdown exactly:
 * Proforma Details, Lab Test, Radiology, Blood Donation Type, Blood Request Type,
 * Branch, Edit Proforma. Working actions open their modal / page; Radiology /
 * Blood Donation Type / Blood Request Type are shown but DISABLED (their
 * kalnostics features don't exist yet) — greyed, never hidden or half-built.
 *
 * The menu renders through a portal pinned to the trigger, so it floats above the
 * table instead of being clipped by the list's `overflow-hidden` wrapper.
 */
export function ProformaActionsMenu({ proforma }: { proforma: ProformaListRow }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const title = proforma.name || proforma.reference;

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
      if (
        !menuRef.current?.contains(t) &&
        !triggerRef.current?.contains(t)
      ) {
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
            className="w-56 rounded-md border border-border bg-background py-1 text-left text-sm shadow-lg"
          >
            <MenuItem onClick={() => openModal('details')}>
              Proforma Details
            </MenuItem>
            <MenuItem onClick={() => openModal('labTest')}>Lab Test</MenuItem>
            <MenuItem disabled title="Radiology is not available yet">
              Radiology
            </MenuItem>
            <MenuItem disabled title="Blood Donation Type is not available yet">
              Blood Donation Type
            </MenuItem>
            <MenuItem disabled title="Blood Request Type is not available yet">
              Blood Request Type
            </MenuItem>
            <MenuItem onClick={() => openModal('branch')}>Branch</MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                navigate(`/proformas/${proforma.id}/edit`);
              }}
            >
              Edit Proforma
            </MenuItem>
          </div>,
          document.body,
        )}

      <LabTestMappingModal
        proformaId={proforma.id}
        proformaName={title}
        open={modal === 'labTest'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <BranchMappingModal
        proformaId={proforma.id}
        proformaName={title}
        open={modal === 'branch'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <ProformaDetailModal
        proformaId={proforma.id}
        proformaName={title}
        open={modal === 'details'}
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
