import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  /** Route to return to via the back button. */
  backTo: string;
  children: ReactNode;
}

/**
 * Page chrome for a dedicated Add/Edit form (back button + title + card) — shared
 * by the document-style form pages (Transfer, Quote, Proforma).
 */
export function FormPageShell({ title, backTo, children }: Props) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(backTo)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
