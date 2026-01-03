import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
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
  Workflow,
  FolderKanban,
  BookOpen,
  MessageSquare,
  User,
  Shield,
  TrendingUp,
  Trophy,
  Rocket,
  GraduationCap,
  Briefcase,
  Settings,
} from 'lucide-react';

const mainNavItems = [
  { title: 'My Dashboard', url: '/portal', icon: LayoutDashboard },
  { title: 'My Projects', url: '/portal/projects', icon: FolderKanban },
  { title: 'My Workflows', url: '/portal/workflows', icon: Workflow },
  { title: 'My Teams', url: '/portal/teams', icon: Users },
];

const marketplaceNavItems = [
  { title: 'Ideas', url: '/portal/ideas', icon: Lightbulb },
  { title: 'Ambassadors', url: '/ambassadors', icon: GraduationCap },
  { title: 'Advisors', url: '/advisors', icon: Briefcase },
  { title: 'Resources', url: '/portal/resources', icon: BookOpen },
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
  const { hasRole } = useAuth();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/portal') {
      return location.pathname === '/portal';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <NavLink to="/portal" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
            <Rocket className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">Yassu</span>
          )}
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
              {marketplaceNavItems.map((item) => (
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
          <p className="text-xs text-muted-foreground text-center">
            © 2024 Yassu
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
