import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/http';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
  type Notification,
} from '@/features/notifications/api';

const LIMIT = 20;

/** In-app notifications: list, mark read, delete; click to follow the link. */
export function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useNotifications({ page, limit: LIMIT, unreadOnly });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const del = useDeleteNotification();

  const onOpen = async (nn: Notification) => {
    if (!nn.isRead) {
      try {
        await markRead.mutateAsync(nn.id);
      } catch {
        /* non-blocking */
      }
    }
    if (nn.link) navigate(nn.link);
  };

  const onMarkAll = async () => {
    try {
      await markAll.mutateAsync();
      toast.success('All marked read');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not mark all read'));
    }
  };

  const rows = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Stock alerts, reminders, and system messages.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setUnreadOnly((v) => !v);
              setPage(1);
            }}
          >
            {unreadOnly ? 'Show all' : 'Unread only'}
          </Button>
          <Button variant="outline" onClick={onMarkAll} disabled={markAll.isPending}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No notifications.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((nn) => (
              <li
                key={nn.id}
                className={`flex items-start gap-3 px-4 py-3 ${
                  nn.isRead ? '' : 'bg-accent/40'
                }`}
              >
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => onOpen(nn)}
                >
                  <div className="flex items-center gap-2">
                    {!nn.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {nn.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(nn.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium">{nn.title}</p>
                  {nn.body && (
                    <p className="text-sm text-muted-foreground">{nn.body}</p>
                  )}
                </button>
                <div className="flex gap-1">
                  {!nn.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Mark read"
                      onClick={() => markRead.mutate(nn.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    onClick={() => del.mutate(nn.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
