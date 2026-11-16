import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProformaForm } from './ProformaForm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Create-proforma dialog — thin modal wrapper around {@link ProformaForm}. */
export function ProformaFormDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New proforma</DialogTitle>
        </DialogHeader>
        {open && <ProformaForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
