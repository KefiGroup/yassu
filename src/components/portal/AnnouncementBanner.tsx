import { useState, useEffect } from 'react';
import { X, Megaphone, Calendar, Wrench, Info, Bell, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'maintenance' | 'event' | 'update' | 'general';
  priority: 'normal' | 'important' | 'urgent';
  startsAt: string;
  endsAt: string | null;
  eventDate: string | null;
  eventEndDate: string | null;
  isActive: boolean;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>(() => {
    const stored = sessionStorage.getItem('dismissed_announcements');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const data = await apiRequest<Announcement[]>('/announcements');
        setAnnouncements(data);
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
      }
    }

    fetchAnnouncements();
  }, []);

  const handleDismiss = (id: number, priority: string) => {
    if (priority === 'urgent') return;
    
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    sessionStorage.setItem('dismissed_announcements', JSON.stringify(newDismissed));
  };

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id) || a.priority === 'urgent'
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'update': return <Info className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const formatEventDate = (eventDate: string | null, eventEndDate: string | null) => {
    if (!eventDate) return null;
    const start = new Date(eventDate);
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    };
    if (eventEndDate) {
      const end = new Date(eventEndDate);
      return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    }
    return start.toLocaleDateString('en-US', options);
  };

  const getBannerStyles = (priority: string, type: string) => {
    if (priority === 'urgent') {
      return 'bg-red-500 text-white border-red-600';
    }
    if (priority === 'important') {
      return 'bg-amber-500 text-white border-amber-600';
    }
    if (type === 'maintenance') {
      return 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700';
    }
    if (type === 'event') {
      return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700';
    }
    return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700';
  };

  return (
    <div className="space-y-0">
      {visibleAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={`px-4 py-2 border-b flex items-center justify-between gap-4 ${getBannerStyles(announcement.priority, announcement.type)}`}
          data-testid={`banner-announcement-${announcement.id}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {announcement.priority === 'urgent' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                getTypeIcon(announcement.type)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold mr-2">{announcement.title}</span>
              <span className="opacity-90">{announcement.message}</span>
              {announcement.eventDate && (
                <span className="ml-2 text-sm opacity-75">
                  ({formatEventDate(announcement.eventDate, announcement.eventEndDate)})
                </span>
              )}
            </div>
          </div>
          {announcement.priority !== 'urgent' && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0 hover:bg-white/20 h-6 w-6 p-0"
              onClick={() => handleDismiss(announcement.id, announcement.priority)}
              data-testid={`button-dismiss-announcement-${announcement.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
