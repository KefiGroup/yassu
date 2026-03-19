import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users, Lightbulb, Mail, Upload, Shield, ShieldCheck, UserMinus, Send, Clock, CheckCircle, XCircle, Crown, Star, UserPlus, Gavel, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface GroupDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  memberCount: number;
  ideaCount: number;
  pendingInviteCount: number;
}

interface GroupMember {
  id: string;
  userId: number;
  role: string;
  joinedAt: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
}

interface GroupIdea {
  id: string;
  title: string;
  problem: string | null;
  stage: string | null;
  isPublic: boolean;
  createdAt: string;
  creatorName: string | null;
}

interface GroupIdeaWithRating extends GroupIdea {
  avgScore: number | null;
  ratingCount: number;
}

interface GroupInvite {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  inviterName: string | null;
}

interface GroupApplication {
  id: string;
  userId: number;
  motivation: string | null;
  status: string;
  createdAt: string;
  user: {
    id: number;
    fullName: string | null;
    email: string;
  };
  profile: {
    avatarUrl: string | null;
    university: string | null;
    skills: string[] | null;
  } | null;
}

interface IdeaRating {
  id: string;
  score: number;
  feedback: string | null;
  raterName: string | null;
  createdAt: string;
}

interface AdminGroup {
  id: string;
  name: string;
  slug: string;
  role: string;
}

const STAGE_LABELS: Record<string, string> = {
  idea_posted: 'Idea Posted',
  business_plan: 'Business Plan',
  find_advisors: 'Find Advisors',
  form_team: 'Form Team',
  build_mvp: 'Build MVP',
  yassu_foundry: 'Yassu Foundry',
  launched: 'Launched',
};

export default function GroupAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [ratingIdeaId, setRatingIdeaId] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: myGroups, isLoading: groupsLoading } = useQuery<AdminGroup[]>({
    queryKey: ['/api/groups/my-groups'],
  });

  const activeSlug = selectedGroup || myGroups?.[0]?.slug || null;

  const { data: group, isLoading: detailsLoading } = useQuery<GroupDetails>({
    queryKey: ['/api/groups', activeSlug, 'details'],
    queryFn: () => apiRequest(`/api/groups/${activeSlug}/details`),
    enabled: !!activeSlug,
  });

  const { data: members, isLoading: membersLoading } = useQuery<GroupMember[]>({
    queryKey: ['/api/groups', activeSlug, 'members'],
    queryFn: () => apiRequest(`/api/groups/${activeSlug}/members`),
    enabled: !!activeSlug,
  });

  const { data: ideasWithRatings, isLoading: ideasLoading } = useQuery<GroupIdeaWithRating[]>({
    queryKey: ['/api/groups', activeSlug, 'ideas-with-ratings'],
    queryFn: () => apiRequest(`/api/groups/${activeSlug}/ideas-with-ratings`),
    enabled: !!activeSlug,
  });

  const { data: invites, isLoading: invitesLoading } = useQuery<GroupInvite[]>({
    queryKey: ['/api/groups', activeSlug, 'invites'],
    queryFn: () => apiRequest(`/api/groups/${activeSlug}/invites`),
    enabled: !!activeSlug,
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<GroupApplication[]>({
    queryKey: ['/api/groups', activeSlug, 'applications'],
    queryFn: () => apiRequest(`/api/groups/${activeSlug}/applications`),
    enabled: !!activeSlug,
  });

  const { data: ideaRatings } = useQuery<IdeaRating[]>({
    queryKey: ['/api/groups', activeSlug, 'ideas', ratingIdeaId, 'ratings'],
    queryFn: () => apiRequest(`/api/groups/${activeSlug}/ideas/${ratingIdeaId}/ratings`),
    enabled: !!activeSlug && !!ratingIdeaId,
  });

  const inviteMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      return apiRequest(`/api/groups/${activeSlug}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
    },
    onSuccess: (data: any) => {
      toast({ title: 'Invites sent', description: `${data.totalSent} invitation(s) sent successfully.` });
      setInviteEmails('');
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'invites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'details'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to send invites.', variant: 'destructive' });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return apiRequest(`/api/groups/${activeSlug}/members/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      toast({ title: 'Role updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'members'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update role.', variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/groups/${activeSlug}/members/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({ title: 'Member removed' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'details'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove member.', variant: 'destructive' });
    },
  });

  const applicationMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: string }) => {
      return apiRequest(`/api/groups/${activeSlug}/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, variables) => {
      toast({ title: variables.status === 'approved' ? 'Application approved' : 'Application rejected' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'details'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update application.', variant: 'destructive' });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async ({ ideaId, score, feedback }: { ideaId: string; score: number; feedback?: string }) => {
      return apiRequest(`/api/groups/${activeSlug}/ideas/${ideaId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, feedback }),
      });
    },
    onSuccess: () => {
      toast({ title: 'Rating saved' });
      setRatingIdeaId(null);
      setRatingScore(5);
      setRatingFeedback('');
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'ideas-with-ratings'] });
      if (ratingIdeaId) {
        queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'ideas', ratingIdeaId, 'ratings'] });
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to submit rating.', variant: 'destructive' });
    },
  });

  const handleSendInvites = () => {
    const emails = inviteEmails
      .split(/[,\n;]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
    if (emails.length === 0) {
      toast({ title: 'No emails', description: 'Please enter at least one email address.', variant: 'destructive' });
      return;
    }
    inviteMutation.mutate(emails);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emails: string[] = [];
      const lines = text.split('\n');
      for (const line of lines) {
        const cells = line.split(',');
        for (const cell of cells) {
          const trimmed = cell.trim().replace(/^["']|["']$/g, '');
          if (trimmed.includes('@') && trimmed.includes('.')) {
            emails.push(trimmed);
          }
        }
      }
      if (emails.length === 0) {
        toast({ title: 'No emails found', description: 'Could not find any email addresses in the CSV file.', variant: 'destructive' });
        return;
      }
      toast({ title: `Found ${emails.length} email(s)`, description: 'Sending invitations...' });
      inviteMutation.mutate(emails);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const pendingApplications = applications?.filter(a => a.status === 'pending') || [];

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!myGroups || myGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <Shield className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Group Admin Access</h2>
        <p className="text-muted-foreground max-w-md">
          You are not an admin of any group. Contact a group owner or platform admin to get access.
        </p>
      </div>
    );
  }

  const filteredMembers = members?.filter(m => {
    if (!memberSearch) return true;
    const search = memberSearch.toLowerCase();
    return (m.fullName?.toLowerCase().includes(search)) || m.email.toLowerCase().includes(search);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6" data-testid="group-admin-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-group-admin-title">Group Admin</h1>
          <p className="text-muted-foreground">Manage your group's members, ideas, and invitations</p>
        </div>
        {myGroups.length > 1 && (
          <Select value={activeSlug || ''} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-[220px]" data-testid="select-group">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {myGroups.map(g => (
                <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {detailsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : group ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5" data-testid="group-admin-tabs">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="applicants" data-testid="tab-applicants" className="relative">
              Applicants
              {pendingApplications.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingApplications.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="members" data-testid="tab-members">Members</TabsTrigger>
            <TabsTrigger value="ideas" data-testid="tab-ideas">Ideas & Ratings</TabsTrigger>
            <TabsTrigger value="invites" data-testid="tab-invites">Invites</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                <Card data-testid="card-member-count">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{group.memberCount}</p>
                        <p className="text-sm text-muted-foreground">Members</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card data-testid="card-idea-count">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-yellow-500/10">
                        <Lightbulb className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{group.ideaCount}</p>
                        <p className="text-sm text-muted-foreground">Ideas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card data-testid="card-applicant-count">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-green-500/10">
                        <UserPlus className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{pendingApplications.length}</p>
                        <p className="text-sm text-muted-foreground">Pending Applicants</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card data-testid="card-invite-count">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-500/10">
                        <Mail className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{group.pendingInviteCount}</p>
                        <p className="text-sm text-muted-foreground">Pending Invites</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>{group.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Slug</p>
                    <p className="font-medium">/{group.slug}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Brand Colors</p>
                    <div className="flex items-center gap-2 mt-1">
                      {group.primaryColor && (
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: `hsl(${group.primaryColor})` }} />
                      )}
                      {group.accentColor && (
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: `hsl(${group.accentColor})` }} />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applicants" className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{applications?.length || 0} total</Badge>
              {pendingApplications.length > 0 && (
                <Badge variant="destructive">{pendingApplications.length} pending</Badge>
              )}
            </div>

            {applicationsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : applications && applications.length > 0 ? (
              <div className="space-y-3">
                {applications.map(app => (
                  <Card key={app.id} data-testid={`card-application-${app.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 mt-0.5">
                            <AvatarImage src={app.profile?.avatarUrl || undefined} />
                            <AvatarFallback>{(app.user.fullName || app.user.email)[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{app.user.fullName || 'Unknown'}</p>
                              <Badge
                                variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}
                              >
                                {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                {app.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                {app.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{app.user.email}</p>
                            {app.profile?.university && (
                              <p className="text-sm text-muted-foreground mt-0.5">{app.profile.university}</p>
                            )}
                            {app.profile?.skills && app.profile.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {app.profile.skills.slice(0, 5).map((skill, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                                ))}
                                {app.profile.skills.length > 5 && (
                                  <Badge variant="outline" className="text-xs">+{app.profile.skills.length - 5}</Badge>
                                )}
                              </div>
                            )}
                            {app.motivation && (
                              <div className="mt-2 p-2 rounded bg-muted text-sm">
                                <p className="text-xs text-muted-foreground mb-0.5 font-medium">Motivation</p>
                                {app.motivation}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Applied {new Date(app.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {app.status === 'pending' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => applicationMutation.mutate({ applicationId: app.id, status: 'approved' })}
                              disabled={applicationMutation.isPending}
                              data-testid={`button-approve-${app.id}`}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applicationMutation.mutate({ applicationId: app.id, status: 'rejected' })}
                              disabled={applicationMutation.isPending}
                              data-testid={`button-reject-${app.id}`}
                            >
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No applications received yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search members..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="max-w-sm"
                data-testid="input-member-search"
              />
              <Badge variant="secondary">{members?.length || 0} members</Badge>
            </div>

            {membersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers?.map(member => (
                  <Card key={member.id} data-testid={`card-member-${member.userId}`}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback>{(member.fullName || member.email)[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.fullName || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant={
                          member.role === 'owner' ? 'default' :
                          member.role === 'admin' ? 'secondary' :
                          member.role === 'judge' ? 'outline' : 'outline'
                        }>
                          {member.role === 'owner' && <Crown className="h-3 w-3 mr-1" />}
                          {member.role === 'admin' && <ShieldCheck className="h-3 w-3 mr-1" />}
                          {member.role === 'judge' && <Gavel className="h-3 w-3 mr-1" />}
                          {member.role}
                        </Badge>
                      </div>
                      {member.userId !== user?.id && member.role !== 'owner' && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(role) => roleMutation.mutate({ userId: member.userId, role })}
                          >
                            <SelectTrigger className="w-[120px]" data-testid={`select-role-${member.userId}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="judge">Judge</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeMutation.mutate(member.userId)}
                            data-testid={`button-remove-${member.userId}`}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {filteredMembers?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No members found</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ideas" className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{ideasWithRatings?.length || 0} ideas</Badge>
              <Badge variant="outline">
                <Star className="h-3 w-3 mr-1" />
                Rate ideas 1-10 for competition advancement
              </Badge>
            </div>

            {ideasLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : ideasWithRatings && ideasWithRatings.length > 0 ? (
              <div className="space-y-3">
                {ideasWithRatings.map(idea => (
                  <Card key={idea.id} data-testid={`card-idea-${idea.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{idea.title}</p>
                            {idea.stage && (
                              <Badge variant="outline" className="text-xs">
                                {STAGE_LABELS[idea.stage] || idea.stage}
                              </Badge>
                            )}
                            <Badge variant={idea.isPublic ? 'secondary' : 'outline'} className="text-xs">
                              {idea.isPublic ? 'Public' : 'Private'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            by {idea.creatorName || 'Unknown'} · {new Date(idea.createdAt).toLocaleDateString()}
                          </p>
                          {idea.problem && (
                            <p className="text-sm mt-1.5 line-clamp-2 text-muted-foreground">{idea.problem}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {idea.avgScore !== null && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-primary">{idea.avgScore}</p>
                              <p className="text-xs text-muted-foreground">{idea.ratingCount} rating{idea.ratingCount !== 1 ? 's' : ''}</p>
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant={ratingIdeaId === idea.id ? 'default' : 'outline'}
                            onClick={() => {
                              if (ratingIdeaId === idea.id) {
                                setRatingIdeaId(null);
                              } else {
                                setRatingIdeaId(idea.id);
                                setRatingScore(5);
                                setRatingFeedback('');
                              }
                            }}
                            data-testid={`button-rate-${idea.id}`}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Rate
                          </Button>
                        </div>
                      </div>

                      {ratingIdeaId === idea.id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="flex items-center gap-4">
                            <label className="text-sm font-medium whitespace-nowrap">Score (1-10):</label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <button
                                  key={n}
                                  className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                                    n <= ratingScore
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted hover:bg-muted-foreground/10'
                                  }`}
                                  onClick={() => setRatingScore(n)}
                                  data-testid={`score-${n}`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Textarea
                            placeholder="Optional feedback for this idea..."
                            value={ratingFeedback}
                            onChange={e => setRatingFeedback(e.target.value)}
                            className="min-h-[60px]"
                            data-testid="input-rating-feedback"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => rateMutation.mutate({ ideaId: idea.id, score: ratingScore, feedback: ratingFeedback || undefined })}
                              disabled={rateMutation.isPending}
                              data-testid="button-submit-rating"
                            >
                              {rateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                              Submit Rating
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setRatingIdeaId(null)}>
                              Cancel
                            </Button>
                          </div>

                          {ideaRatings && ideaRatings.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">Previous Ratings</p>
                              {ideaRatings.map(r => (
                                <div key={r.id} className="flex items-start gap-2 p-2 rounded bg-muted text-sm">
                                  <Badge variant="outline" className="shrink-0">{r.score}/10</Badge>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-xs">{r.raterName || 'Unknown'}</p>
                                    {r.feedback && <p className="text-muted-foreground mt-0.5">{r.feedback}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No ideas posted in this group yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Send Invitations</CardTitle>
                <CardDescription>
                  Enter email addresses separated by commas, or upload a CSV file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="email1@university.edu, email2@university.edu&#10;email3@university.edu"
                  value={inviteEmails}
                  onChange={e => setInviteEmails(e.target.value)}
                  data-testid="input-invite-emails"
                />
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSendInvites}
                    disabled={inviteMutation.isPending || !inviteEmails.trim()}
                    data-testid="button-send-invites"
                  >
                    {inviteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Invites
                  </Button>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv,.txt"
                      ref={fileInputRef}
                      onChange={handleCSVUpload}
                      className="hidden"
                      data-testid="input-csv-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={inviteMutation.isPending}
                      data-testid="button-upload-csv"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invitation History</CardTitle>
                <CardDescription>
                  {invites?.length || 0} total invitations sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invitesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : invites && invites.length > 0 ? (
                  <div className="space-y-2">
                    {invites.map(invite => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                        data-testid={`invite-${invite.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-muted">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{invite.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Invited by {invite.inviterName || 'Admin'} · {new Date(invite.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={invite.status === 'accepted' ? 'default' : invite.status === 'expired' ? 'destructive' : 'secondary'}
                        >
                          {invite.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {invite.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {invite.status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                          {invite.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6">No invitations sent yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}