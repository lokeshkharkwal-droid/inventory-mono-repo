import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/http';
import { useRequisitionAction, type RequisitionListRow } from './api';

interface Props {
  requisition: RequisitionListRow | null;
  action: 'approve' | 'reject';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Approve/Reject a requisition with a required comment (legacy approval modal). */
export function ApprovalDialog({ requisition, action, open, onOpenChange }: Props) {
  const [comment, setComment] = useState('');
  const act = useRequisitionAction();

  useEffect(() => {
    if (open) setComment('');
  }, [open]);

  const submit = async () => {
    if (!requisition) return;
    if (!comment.trim()) {
      toast.error('Please enter a comment.');
      return;
    }
    try {
      await act.mutateAsync({
        id: requisition.id,
        action,
        body: { comment: comment.trim() },
      });
      toast.success(`Requisition ${action}d`);
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Could not ${action} requisition`));
    }
  };

  const isApprove = action === 'approve';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isApprove ? 'Approve' : 'Reject'} requisition{' '}
            {requisition?.reference}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="req-comment">Comment</Label>
          <textarea
            id="req-comment"
            className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isApprove ? 'Approval note…' : 'Reason for rejection…'
            }
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isApprove ? 'default' : 'destructive'}
            onClick={submit}
            disabled={act.isPending}
          >
            {act.isPending ? 'Saving…' : isApprove ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
