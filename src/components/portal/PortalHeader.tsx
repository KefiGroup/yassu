import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, Bell, LogOut, User, Settings, Home, Shield, Megaphone, Calendar, Wrench, Info, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'maintenance' | 'event' | 'update' | 'general';
  priority: 'normal' | 'important' | 'urgent';
  startsAt: string;
  endsAt: string | null;
}

export function PortalHeader() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const result = await apiRequest<{ isAdmin: boolean }>('/admin/check');
        setIsAdmin(result.isAdmin);
      } catch {
        setIsAdmin(false);
      }
    }
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

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

  const getAnnouncementIcon = (type: string, priority: string) => {
    if (priority === 'urgent') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    switch (type) {
      case 'maintenance': return <Wrench className="w-4 h-4 text-yellow-600" />;
      case 'event': return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'update': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Megaphone className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/portal/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4 sticky top-0 z-40">
      <SidebarTrigger className="-ml-2" />
      
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search ideas, teams, people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
              <Bell className="h-4 w-4" />
              {announcements.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center justify-between">
                Notifications
                {announcements.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{announcements.length}</Badge>
                )}
              </h4>
              {announcements.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`notification-announcement-${announcement.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {getAnnouncementIcon(announcement.type, announcement.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-sm">{announcement.title}</span>
                            {announcement.priority !== 'normal' && (
                              <Badge 
                                variant={announcement.priority === 'urgent' ? 'destructive' : 'default'}
                                className="text-xs py-0 px-1"
                              >
                                {announcement.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {announcement.message}
                          </p>
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {new Date(announcement.startsAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatarUrl || undefined} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {getInitials(profile?.fullName || user?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium">
                {profile?.fullName || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{profile?.fullName || 'User'}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/')}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/portal/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/portal/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate('/portal/admin')}>
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
