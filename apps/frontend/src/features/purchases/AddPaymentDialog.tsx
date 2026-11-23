import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { AttachmentUpload } from '@/components/shared/AttachmentUpload';
import { getApiErrorMessage } from '@/lib/http';
import { useAddPurchasePayment } from '@/features/purchases/api';

/**
 * "Paying by" options — EZHT `paid_opts` (Cash, Gift Card, Credit Card, Check,
 * Other). The label is shown; the code is stored as the payment `method`.
 */
const PAY_METHODS: { code: string; label: string }[] = [
  { code: 'CASH', label: 'Cash' },
  { code: 'GIFT_CARD', label: 'Gift Card' },
  { code: 'CARD', label: 'Credit Card' },
  { code: 'CHEQUE', label: 'Check' },
  { code: 'OTHER', label: 'Other' },
];

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  purchaseId: string;
  reference?: string;
  /** Outstanding balance — the Amount field defaults to it (EZHT grand_total − paid). */
  balance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Add a payment against a purchase (EZHT `Purchases::add_payment`). Fields mirror
 * the legacy modal: Date (today), Reference Number, Amount (defaults to balance),
 * Paying By, method-specific detail, Attachment and Notes.
 */
export function AddPaymentDialog({
  purchaseId,
  reference,
  balance,
  open,
  onOpenChange,
}: Props) {
  const addPayment = useAddPurchasePayment(purchaseId);
  const [date, setDate] = useState(today());
  const [ref, setRef] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [chequeNo, setChequeNo] = useState('');
  const [ccNo, setCcNo] = useState('');
  const [ccHolder, setCcHolder] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [note, setNote] = useState('');

  // Reset to a fresh form (amount = outstanding balance) whenever reopened.
  useEffect(() => {
    if (open) {
      setDate(today());
      setRef('');
      setAmount(balance > 0 ? String(balance.toFixed(2)) : '');
      setMethod('CASH');
      setChequeNo('');
      setCcNo('');
      setCcHolder('');
      setAttachmentUrl('');
      setNote('');
    }
  }, [open, balance]);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount.');
    try {
      await addPayment.mutateAsync({
        amount: amt,
        method,
        reference: ref || undefined,
        date: date || undefined,
        chequeNo: method === 'CHEQUE' ? chequeNo || undefined : undefined,
        ccNo: method === 'CARD' ? ccNo || undefined : undefined,
        ccHolder: method === 'CARD' ? ccHolder || undefined : undefined,
        attachmentUrl: attachmentUrl || undefined,
        note: note || undefined,
      });
      toast.success('Payment added');
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not add payment'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Payment{reference ? ` — ${reference}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reference Number</Label>
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="Auto if blank"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Paying By</Label>
              <select
                className={selectCls}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {PAY_METHODS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {method === 'CHEQUE' && (
              <div className="col-span-2 space-y-1.5">
                <Label>Cheque No</Label>
                <Input
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                />
              </div>
            )}
            {method === 'CARD' && (
              <>
                <div className="space-y-1.5">
                  <Label>Card No</Label>
                  <Input value={ccNo} onChange={(e) => setCcNo(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Card Holder</Label>
                  <Input
                    value={ccHolder}
                    onChange={(e) => setCcHolder(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Attachment</Label>
            <AttachmentUpload value={attachmentUrl} onChange={setAttachmentUrl} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={addPayment.isPending}>
            {addPayment.isPending ? 'Saving…' : 'Add Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
