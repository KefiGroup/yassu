import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Users, ClipboardCheck, ArrowRight, Plus, Shield, Star, Eye } from 'lucide-react';

interface Membership {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface Application {
  id: string;
  groupId: string;
  groupName: string;
  groupSlug: string;
  status: string;
  projectTitle: string | null;
  createdAt: string;
}

interface AvailableGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const roleIcons: Record<string, typeof Shield> = {
  owner: Star,
  admin: Shield,
  judge: Eye,
  member: Users,
};

function getRoleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function MyGroups() {
  const { user } = useAuth();

  const { data: memberships, isLoading: membershipsLoading } = useQuery<Membership[]>({
    queryKey: ['/api/groups/my-memberships'],
    queryFn: () => apiRequest('/groups/my-memberships'),
    enabled: !!user,
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ['/api/my-group-applications'],
    queryFn: () => apiRequest('/my-group-applications'),
    enabled: !!user,
  });

  const { data: availableGroups, isLoading: availableLoading } = useQuery<AvailableGroup[]>({
    queryKey: ['/api/groups/available'],
    queryFn: () => apiRequest('/groups/available'),
    enabled: !!user,
  });

  const memberGroupIds = new Set(memberships?.map(m => m.id) || []);
  const groupsToApply = availableGroups?.filter(
    g => !memberGroupIds.has(g.id)
  ) || [];

  const isLoading = membershipsLoading || applicationsLoading || availableLoading;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-groups-title">My Groups</h1>
        <p className="text-muted-foreground mt-1">View your group memberships, applications, and discover new groups to join.</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          My Memberships
        </h2>
        {isLoading ? (
          <div className="grid gap-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : memberships && memberships.length > 0 ? (
          <div className="grid gap-3">
            {memberships.map(m => {
              const RoleIcon = roleIcons[m.role] || Users;
              return (
                <Card key={m.id} data-testid={`card-membership-${m.slug}`}>
                  <CardContent className="flex items-center justify-between py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <RoleIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`text-group-name-${m.slug}`}>{m.name}</p>
                        <p className="text-sm text-muted-foreground">Role: {getRoleLabel(m.role)}</p>
                      </div>
                    </div>
                    {(m.role === 'owner' || m.role === 'admin' || m.role === 'judge') && (
                      <NavLink to={`/portal/group-admin?group=${m.slug}`}>
                        <Button variant="outline" size="sm" data-testid={`button-manage-${m.slug}`}>
                          Manage
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </NavLink>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>You're not a member of any groups yet.</p>
              <p className="text-sm mt-1">Apply to a group below to get started!</p>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator />

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          My Applications
        </h2>
        {isLoading ? (
          <div className="grid gap-3">
            {[1].map(i => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : applications && applications.length > 0 ? (
          <div className="grid gap-3">
            {applications.map(app => (
              <Card key={app.id} data-testid={`card-application-${app.id}`}>
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div>
                    <p className="font-medium">{app.groupName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={statusColors[app.status] || statusColors.pending} data-testid={`badge-status-${app.id}`}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </Badge>
                      {app.projectTitle && (
                        <span className="text-sm text-muted-foreground">— {app.projectTitle}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Applied {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <NavLink to={`/portal/applications/${app.groupSlug}`}>
                    <Button variant="outline" size="sm" data-testid={`button-view-app-${app.id}`}>
                      {app.status === 'draft' ? 'Continue' : 'View'}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </NavLink>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>You haven't applied to any groups yet.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {groupsToApply.length > 0 && (
        <>
          <Separator />
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Apply to a Group
            </h2>
            <div className="grid gap-3">
              {groupsToApply.map(g => {
                const hasExistingApps = applications?.some(a => a.groupId === g.id);
                return (
                  <Card key={g.id} data-testid={`card-discover-${g.slug}`}>
                    <CardContent className="flex items-center justify-between py-4 px-5">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{g.name}</p>
                        {g.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-md mt-0.5">
                            {g.description.replace(/<[^>]*>/g, '').slice(0, 120)}
                            {g.description.replace(/<[^>]*>/g, '').length > 120 ? '...' : ''}
                          </p>
                        )}
                      </div>
                      <NavLink to={`/apply/${g.slug}`}>
                        <Button size="sm" data-testid={`button-apply-${g.slug}`}>
                          {hasExistingApps ? 'New Application' : 'Apply'}
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </NavLink>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
