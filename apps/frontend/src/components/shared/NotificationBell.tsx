import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/features/notifications/api';

/** Header bell showing the unread notification count; routes to the list. */
export function NotificationBell({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      title="Notifications"
      onClick={() => navigate('/notifications')}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
}
