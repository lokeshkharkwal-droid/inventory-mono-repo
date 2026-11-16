import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Paperclip, X, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadInventoryDocument } from '@/lib/http';
import { getApiErrorMessage } from '@/lib/http';

interface Props {
  /** Current stored URL (the form field value). Empty string = no file. */
  value: string;
  /** Called with the uploaded file's public URL (or '' when cleared). */
  onChange: (url: string) => void;
  /** Optional accept filter for the native picker. */
  accept?: string;
  /** Disable the control. */
  disabled?: boolean;
}

/** Derive a short display name from a stored URL (last path segment). */
function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split('/').pop() || url);
  } catch {
    return url.split('/').pop() || url;
  }
}

/**
 * Document attachment control — uploads a file to the inventory backend's
 * DigitalOcean Spaces endpoint and stores the returned public URL in the form
 * field. Shows the uploaded file as a link with a clear (✕) action; while a
 * file is uploading the button shows a spinner. Used for the "Document" fields
 * on transfer / quote / requisition / purchase / material forms.
 */
export function AttachmentUpload({
  value,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.svg,.doc,.docx,.xls,.xlsx,.csv',
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadInventoryDocument(file);
      onChange(url);
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not upload the document'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onFile}
        disabled={disabled || uploading}
      />
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-primary hover:underline"
            title={value}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{fileNameFromUrl(value)}</span>
          </a>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={disabled}
            onClick={() => onChange('')}
            aria-label="Remove document"
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          disabled={disabled || uploading}
          onClick={pick}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          {uploading ? 'Uploading…' : 'Choose document…'}
        </Button>
      )}
    </div>
  );
}
