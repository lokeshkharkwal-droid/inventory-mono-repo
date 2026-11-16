import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransferForm } from './TransferForm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Create-transfer dialog — thin modal wrapper around {@link TransferForm}. */
export function TransferFormDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New transfer</DialogTitle>
        </DialogHeader>
        {open && <TransferForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
