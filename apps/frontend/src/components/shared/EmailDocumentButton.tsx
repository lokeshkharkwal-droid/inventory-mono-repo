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
  type: 'sale' | 'purchase' | 'quote' | 'proforma' | 'requisition' | 'transfer';
  id: string;
  /** Pre-fill the recipient (e.g. the customer/supplier email). */
  defaultTo?: string | null;
  /** Pre-fill the subject line. */
  defaultSubject?: string;
  title?: string;
}

/**
 * Emails a document (invoice / PO / quote / proforma / requisition / transfer)
 * through the backend, which forwards it to the kalnostics comms gateway. Opens a
 * dialog to confirm the recipient, subject, optional CC/BCC and a message (EZHT
 * email-dialog parity: To / Subject / Message, plus CC/BCC).
 */
export function EmailDocumentButton({
  type,
  id,
  defaultTo,
  defaultSubject,
  title = 'Email',
}: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultTo ?? '');
  const [subject, setSubject] = useState(defaultSubject ?? '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [message, setMessage] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!to.trim()) {
      toast.error('Enter a recipient email.');
      return;
    }
    setBusy(true);
    try {
      await request('POST', '/print/email', {
        body: {
          type,
          id,
          to: to.trim(),
          subject: subject.trim() || undefined,
          cc: cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          message: message || undefined,
        },
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
          setSubject(defaultSubject ?? '');
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
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="(default if blank)"
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
            {showMore ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email-cc">CC</Label>
                  <Input
                    id="email-cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="comma-separated"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-bcc">BCC</Label>
                  <Input
                    id="email-bcc"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="comma-separated"
                  />
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="px-0"
                onClick={() => setShowMore(true)}
              >
                Add CC / BCC
              </Button>
            )}
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
