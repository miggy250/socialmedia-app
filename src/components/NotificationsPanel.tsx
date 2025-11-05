import { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/api';

export const NotificationsPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.getNotifications(20);
      return res.notifications as Array<{ id: string; content: string; created_at: string; is_read?: boolean }>;
    },
    enabled: !!user,
  });

  useEffect(() => {
    // No realtime hookup yet
    return () => {};
  }, [user, queryClient]);

  const markAsRead = async (id: string) => {
    await apiClient.markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const notifications = data || [];
  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 bg-destructive rounded-full text-xs text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-3">
          {notifications?.map((notification: any) => (
            <div
              key={notification.id}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
              className={`p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors ${
                !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
              }`}
            >
              <p className="font-medium text-sm">{notification.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
          
          {notifications?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No notifications yet</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
