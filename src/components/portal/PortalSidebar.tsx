import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Lightbulb,
  Users,
  FolderKanban,
  BookOpen,
  MessageSquare,
  User,
  Shield,
  TrendingUp,
  Trophy,
  GraduationCap,
  Briefcase,
  Settings,
  DollarSign,
  Rocket,
} from 'lucide-react';

const mainNavItems = [
  { title: 'My Dashboard', url: '/portal', icon: LayoutDashboard },
  { title: 'My Projects', url: '/portal/projects', icon: FolderKanban },
  { title: 'My Teams', url: '/portal/teams', icon: Users },
];

const getMarketplaceNavItems = (brandId?: string) => [
  { title: brandId === 'bruin' ? 'Bruin Marketplace' : 'Ideas', url: '/portal/ideas', icon: Lightbulb },
  { title: 'Collaborators', url: '/portal/collaborators', icon: Users },
  { title: 'Ambassadors', url: '/portal/ambassadors', icon: GraduationCap },
  { title: 'Advisors', url: '/portal/advisors', icon: Briefcase },
  { title: 'Resources', url: '/portal/resources', icon: BookOpen },
  { title: 'Foundry', url: '/portal/foundry', icon: Rocket },
  { title: 'Messages', url: '/portal/messages', icon: MessageSquare },
];

const accountNavItems = [
  { title: 'Profile', url: '/portal/profile', icon: User },
  { title: 'Settings', url: '/portal/settings', icon: Settings },
];

const adminNavItems = [
  { title: 'Admin', url: '/portal/admin', icon: Shield },
  { title: 'Pipeline', url: '/portal/pipeline', icon: TrendingUp },
];

const sponsorNavItems = [
  { title: 'Challenges', url: '/portal/challenges', icon: Trophy },
];

export function PortalSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { hasRole, user } = useAuth();
  const brand = useBranding();
  const collapsed = state === 'collapsed';

  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ['/api/messages/unread/count'],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.unreadCount || 0;

  const isActive = (path: string) => {
    if (path === '/portal') {
      return location.pathname === '/portal';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarHeader className="h-14 border-b border-sidebar-border px-3 flex items-center">
        <NavLink to="/portal" className="flex items-center">
          <img 
            src={brand.logoPath} 
            alt={brand.name} 
            className={collapsed ? "h-10 w-auto" : "h-12 w-auto"}
          />
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Marketplace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getMarketplaceNavItems(brand.id).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <NavLink to={item.url} className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </span>
                      {item.title === 'Messages' && unreadCount > 0 && !collapsed && (
                        <Badge 
                          variant="destructive" 
                          className="h-5 min-w-5 px-1.5 text-xs"
                          data-testid="badge-unread-messages"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                      {item.title === 'Messages' && unreadCount > 0 && collapsed && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(hasRole('sponsor')) && (
          <SidebarGroup>
            <SidebarGroupLabel>Sponsor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sponsorNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(hasRole('admin') || hasRole('investor')) && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!collapsed && (
          <div className="text-xs text-muted-foreground text-center space-y-0.5">
            <p>© {new Date().getFullYear()} {brand.copyrightName}</p>
            {brand.id !== 'yassu' && (
              <p className="text-muted-foreground/60">Powered by <a href="https://yassu.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Yassu</a></p>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
