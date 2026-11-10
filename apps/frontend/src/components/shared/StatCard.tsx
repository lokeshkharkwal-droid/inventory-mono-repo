import { Card, CardContent } from '@/components/ui/card';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
}

/** A compact dashboard/report metric card. */
export function StatCard({ label, value, hint }: Props) {
  return (
    <Card className="hover:shadow-md">
      <CardContent className="space-y-1 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-[1.75rem] font-semibold leading-tight tracking-tight">
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
