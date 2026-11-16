import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QuoteForm } from './QuoteForm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Create-quote dialog — thin modal wrapper around {@link QuoteForm}. */
export function QuoteFormDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New quote</DialogTitle>
        </DialogHeader>
        {open && <QuoteForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
