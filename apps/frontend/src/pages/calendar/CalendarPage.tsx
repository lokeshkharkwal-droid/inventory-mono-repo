import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
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
import { getApiErrorMessage } from '@/lib/http';
import {
  useCalendarEvents,
  useCreateEvent,
  useDeleteEvent,
} from '@/features/calendar/api';

/** First and last day of a month, as YYYY-MM-DD. */
function monthBounds(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  return { from: iso(first), to: iso(last) };
}

/** Calendar events: month list + create/delete (reminders, follow-ups). */
export function CalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const bounds = monthBounds(cursor.year, cursor.month);
  const { data, isLoading } = useCalendarEvents(bounds);
  const create = useCreateEvent();
  const del = useDeleteEvent();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startAt: '',
    color: '',
  });

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  );

  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const submit = async () => {
    if (!form.title || !form.startAt) {
      toast.error('Title and start date/time are required.');
      return;
    }
    try {
      await create.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        startAt: new Date(form.startAt).toISOString(),
        color: form.color || undefined,
      });
      toast.success('Event created');
      setOpen(false);
      setForm({ title: '', description: '', startAt: '', color: '' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create event'));
    }
  };

  const events = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Reminders, appointments, and follow-ups.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New event
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => shift(-1)}>
          Prev
        </Button>
        <span className="min-w-40 text-center font-medium">{monthLabel}</span>
        <Button variant="outline" size="sm" onClick={() => shift(1)}>
          Next
        </Button>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No events this month.
          </p>
        ) : (
          <ul className="divide-y">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: e.color ?? '#6366f1' }}
                />
                <div className="flex-1">
                  <p className="font-medium">{e.title}</p>
                  {e.description && (
                    <p className="text-sm text-muted-foreground">{e.description}</p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(e.startAt).toLocaleString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  onClick={() => del.mutate(e.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Input
                type="color"
                value={form.color || '#6366f1'}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-20 p-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
