import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  usePurchase,
  useDeletePurchasePayment,
} from '@/features/purchases/api';

/** Display the stored payment-method code with a friendly label (EZHT paid_opts). */
const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  GIFT_CARD: 'Gift Card',
  CARD: 'Credit Card',
  CHEQUE: 'Check',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
};

interface Props {
  purchaseId: string;
  reference?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Payment history for a purchase (EZHT `Purchases::payments`). Lists each payment's
 * date/time, reference, paying-by, cheque/card detail, note and amount, with a
 * delete action that re-derives the purchase's paid total + payment status.
 */
export function ViewPaymentsDialog({
  purchaseId,
  reference,
  open,
  onOpenChange,
}: Props) {
  const { data: detail } = usePurchase(open ? purchaseId : null);
  const delPayment = useDeletePurchasePayment(purchaseId);
  const payments = detail?.payments ?? [];
  const money = (v: number) => Number(v).toFixed(2);

  const remove = (id: string) => {
    if (!confirm('Delete this payment?')) return;
    delPayment.mutate(id, {
      onSuccess: () => toast.success('Payment deleted'),
      onError: () => toast.error('Could not delete payment'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            View Payments{reference ? ` — ${reference}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Date</th>
                <th className="px-2">Reference</th>
                <th className="px-2">Paid By</th>
                <th className="px-2">Detail</th>
                <th className="px-2">Note</th>
                <th className="px-2 text-right">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 whitespace-nowrap">
                    {new Date(p.date).toLocaleString()}
                  </td>
                  <td className="px-2">{p.reference ?? '—'}</td>
                  <td className="px-2">{METHOD_LABELS[p.method] ?? p.method}</td>
                  <td className="px-2 text-muted-foreground">
                    {p.chequeNo
                      ? `Cheque ${p.chequeNo}`
                      : p.ccNo
                        ? `Card ${p.ccNo}${p.ccHolder ? ` · ${p.ccHolder}` : ''}`
                        : '—'}
                  </td>
                  <td className="px-2">{p.note ?? '—'}</td>
                  <td className="px-2 text-right tabular-nums">
                    {money(p.amount)}
                  </td>
                  <td className="px-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete payment"
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No payments recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
