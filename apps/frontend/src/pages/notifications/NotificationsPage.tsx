import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/http';
import {
  useInfiniteNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
  type Notification,
} from '@/features/notifications/api';

/** In-app notifications: list, mark read, delete; click to follow the link. */
export function NotificationsPage() {
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteNotifications({ extra: { unreadOnly: unreadOnly || undefined } });
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
            onClick={() => setUnreadOnly((v) => !v)}
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

        {hasMore && (
          <div className="flex justify-center border-t px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={isFetchingMore}
              onClick={() => fetchMore()}
            >
              {isFetchingMore ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
