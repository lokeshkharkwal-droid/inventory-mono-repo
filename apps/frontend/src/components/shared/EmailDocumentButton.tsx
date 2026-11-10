import { useState } from 'react';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
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
import { request, getApiErrorMessage } from '@/lib/http';

interface Props {
  /** Document kind the backend knows how to render + email. */
  type: 'sale' | 'purchase' | 'quote' | 'proforma';
  id: string;
  /** Pre-fill the recipient (e.g. the customer/supplier email). */
  defaultTo?: string | null;
  title?: string;
}

/**
 * Emails a document (invoice / PO / quote / proforma) through the backend, which
 * forwards it to the kalnostics comms gateway. Opens a small dialog to confirm
 * the recipient and an optional message.
 */
export function EmailDocumentButton({ type, id, defaultTo, title = 'Email' }: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultTo ?? '');
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
        body: { type, id, to: to.trim(), message: message || undefined },
      });
      toast.success('Email queued.');
      setOpen(false);
      setMessage('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not send the email'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title={title}
        onClick={() => {
          setTo(defaultTo ?? '');
          setOpen(true);
        }}
      >
        <Mail className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email-to">Recipient email</Label>
              <Input
                id="email-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-msg">Message (optional)</Label>
              <Input
                id="email-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please find your document attached."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={send} disabled={busy}>
              {busy ? 'Sending…' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
