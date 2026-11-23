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
import {
  useDeleteQuote,
  useQuoteStatus,
  type QuoteListRow,
} from './api';

/**
 * Quote row "Actions" menu — EZ Health Track parity (controller `Quotes`).
 * Mirrors the legacy dropdown: Quote Details, Edit Quote, Approve / Reject (with
 * a required comment → status history), Create Invoice / Create Purchase (opens
 * the downstream add-form prefilled from the quote), Download PDF, Email Quote,
 * Delete Quote. Converted quotes lock out edit / convert / status changes.
 *
 * Rendered through a portal pinned to the trigger so it floats above the table.
 */
export function QuoteActionsMenu({ quote }: { quote: QuoteListRow }) {
  const navigate = useNavigate();
  const del = useDeleteQuote();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<'approve' | 'reject' | 'email' | null>(
    null,
  );
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const converted = quote.status === 'CONVERTED';
  const isPurchase = quote.type === 'PURCHASE';

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

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const printPdf = async () => {
    setOpen(false);
    const ok = await openPrintDocument(`/print/quote/${quote.id}`);
    if (!ok) toast.error('Pop-up blocked — allow pop-ups to print.');
  };

  const remove = () => {
    setOpen(false);
    if (!confirm(`Delete quote ${quote.reference}?`)) return;
    del.mutate(quote.id, {
      onSuccess: () => toast.success('Quote deleted'),
      onError: (err) =>
        toast.error(getApiErrorMessage(err, 'Could not delete quote')),
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
            className="w-56 rounded-md border border-border bg-background py-1 text-left text-sm shadow-lg"
          >
            <MenuItem onClick={() => go(`/quotes/view/${quote.id}`)}>
              Quote Details
            </MenuItem>
            <MenuItem
              disabled={converted}
              title={converted ? 'A converted quote cannot be edited' : undefined}
              onClick={() =>
                go(
                  isPurchase
                    ? `/quotes/purchases/edit/${quote.id}`
                    : `/quotes/edit/${quote.id}`,
                )
              }
            >
              Edit Quote
            </MenuItem>
            <Divider />
            <MenuItem
              disabled={converted}
              onClick={() => {
                setModal('approve');
                setOpen(false);
              }}
            >
              Approve
            </MenuItem>
            <MenuItem
              disabled={converted}
              onClick={() => {
                setModal('reject');
                setOpen(false);
              }}
            >
              Reject
            </MenuItem>
            <MenuItem
              disabled={converted}
              title={converted ? 'Already converted' : undefined}
              onClick={() =>
                go(
                  isPurchase
                    ? `/purchases/add?fromQuote=${quote.id}`
                    : `/sales/add?fromQuote=${quote.id}`,
                )
              }
            >
              {isPurchase ? 'Create Purchase' : 'Create Invoice'}
            </MenuItem>
            <Divider />
            <MenuItem onClick={printPdf}>Download PDF</MenuItem>
            <MenuItem
              onClick={() => {
                setModal('email');
                setOpen(false);
              }}
            >
              Email Quote
            </MenuItem>
            <Divider />
            <MenuItem destructive onClick={remove}>
              Delete Quote
            </MenuItem>
          </div>,
          document.body,
        )}

      <QuoteApprovalDialog
        quoteId={quote.id}
        reference={quote.reference}
        decision={modal === 'reject' ? 'REJECTED' : 'APPROVED'}
        open={modal === 'approve' || modal === 'reject'}
        onOpenChange={(o) => !o && setModal(null)}
      />
      <EmailQuoteDialog
        quoteId={quote.id}
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

/**
 * Approve / reject a quote with a required comment (EZHT `quotes/approval`
 * modal → writes the status-history trail).
 */
export function QuoteApprovalDialog({
  quoteId,
  reference,
  decision,
  open,
  onOpenChange,
}: {
  quoteId: string;
  reference: string;
  decision: 'APPROVED' | 'REJECTED';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const status = useQuoteStatus();
  const [comment, setComment] = useState('');

  const submit = async () => {
    if (comment.trim().length < 3) {
      toast.error('Please add a comment (min 3 characters).');
      return;
    }
    try {
      await status.mutateAsync({ id: quoteId, status: decision, comment: comment.trim() });
      toast.success(`Quote ${decision === 'APPROVED' ? 'approved' : 'rejected'}`);
      setComment('');
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update status'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {decision === 'APPROVED' ? 'Approve' : 'Reject'} quote {reference}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="quote-approval-comment">Comment</Label>
          <Input
            id="quote-approval-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Reason / note for the decision"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={status.isPending}>
            {status.isPending ? 'Saving…' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Email the quotation (EZHT `quotes/email`) via `POST /print/email`. */
function EmailQuoteDialog({
  quoteId,
  defaultTo,
  open,
  onOpenChange,
}: {
  quoteId: string;
  defaultTo?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [to, setTo] = useState(defaultTo ?? '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTo(defaultTo ?? '');
  }, [open, defaultTo]);

  const send = async () => {
    if (!to.trim()) {
      toast.error('Enter a recipient email.');
      return;
    }
    setBusy(true);
    try {
      await request('POST', '/print/email', {
        body: {
          type: 'quote',
          id: quoteId,
          to: to.trim(),
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject: subject || undefined,
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
          <DialogTitle>Email quotation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="quote-email-to">Recipient email</Label>
            <Input
              id="quote-email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quote-email-cc">CC (comma-separated)</Label>
            <Input
              id="quote-email-cc"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc1@example.com, cc2@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quote-email-bcc">BCC (comma-separated)</Label>
            <Input
              id="quote-email-bcc"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="bcc@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quote-email-subject">Subject (optional)</Label>
            <Input
              id="quote-email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quotation from your supplier"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quote-email-msg">Message (optional)</Label>
            <Input
              id="quote-email-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please find your quotation attached."
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
