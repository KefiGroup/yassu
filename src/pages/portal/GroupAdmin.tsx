import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Loader2, Users, Lightbulb, Mail, Upload, Shield, ShieldCheck, UserMinus, Send, Clock, CheckCircle, XCircle, Crown, Star, UserPlus, Gavel, ThumbsUp, ThumbsDown, MessageSquare, ImageIcon, Camera, Edit, RotateCw, X, Link2, Copy, FileText, ExternalLink, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));

interface GroupDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  memberCount: number;
  ideaCount: number;
  pendingInviteCount: number;
  redirectUrl: string | null;
  submissionMessage: string | null;
  submissionFileUrl: string | null;
  autoApprove?: boolean;
  applicationDeadline?: string | null;
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
  answers: { question: string; answer: string }[] | null;
  projectTitle: string | null;
  universityName: string | null;
  graduationYear: string | null;
  major: string | null;
  teamEmails: string[] | null;
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

interface MyApplication {
  id: string;
  status: string;
  answers: { question: string; answer: string }[] | null;
  createdAt: string;
}

export default function GroupAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const groupParam = new URLSearchParams(window.location.search).get('group');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(groupParam);
  const [inviteEmails, setInviteEmails] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [ratingIdeaId, setRatingIdeaId] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; description: string; primaryColor: string; accentColor: string; autoApprove: boolean; applicationDeadline: string }>({ name: '', description: '', primaryColor: '', accentColor: '', autoApprove: false, applicationDeadline: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: myGroups, isLoading: groupsLoading } = useQuery<AdminGroup[]>({
    queryKey: ['/api/groups/my-groups'],
  });

  const activeSlug = selectedGroup || myGroups?.[0]?.slug || null;
  const myRole = myGroups?.find(g => g.slug === activeSlug)?.role || 'member';

  const { data: group, isLoading: detailsLoading } = useQuery<GroupDetails>({
    queryKey: ['/api/groups', activeSlug, 'details'],
    queryFn: () => apiRequest(`/groups/${activeSlug}/details`),
    enabled: !!activeSlug,
  });

  const roleIsJudge = myRole === 'judge';

  const { data: members, isLoading: membersLoading } = useQuery<GroupMember[]>({
    queryKey: ['/api/groups', activeSlug, 'members'],
    queryFn: () => apiRequest(`/groups/${activeSlug}/members`),
    enabled: !!activeSlug && !roleIsJudge,
  });

  const { data: ideasWithRatings, isLoading: ideasLoading } = useQuery<GroupIdeaWithRating[]>({
    queryKey: ['/api/groups', activeSlug, 'ideas-with-ratings'],
    queryFn: () => apiRequest(`/groups/${activeSlug}/ideas-with-ratings`),
    enabled: !!activeSlug,
  });

  const { data: invites, isLoading: invitesLoading } = useQuery<GroupInvite[]>({
    queryKey: ['/api/groups', activeSlug, 'invites'],
    queryFn: () => apiRequest(`/groups/${activeSlug}/invites`),
    enabled: !!activeSlug && !roleIsJudge,
    refetchInterval: 30000,
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<GroupApplication[]>({
    queryKey: ['/api/groups', activeSlug, 'applications'],
    queryFn: () => apiRequest(`/groups/${activeSlug}/applications`),
    enabled: !!activeSlug && !roleIsJudge,
  });

  const { data: ideaRatings } = useQuery<IdeaRating[]>({
    queryKey: ['/api/groups', activeSlug, 'ideas', ratingIdeaId, 'ratings'],
    queryFn: () => apiRequest(`/groups/${activeSlug}/ideas/${ratingIdeaId}/ratings`),
    enabled: !!activeSlug && !!ratingIdeaId,
  });

  const { data: myApplicationData } = useQuery<{ application: MyApplication | null }>({
    queryKey: ['/api/groups', activeSlug, 'my-application'],
    queryFn: () => apiRequest(`/groups/${activeSlug}/my-application`),
    enabled: !!activeSlug,
  });

  const inviteMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      return apiRequest(`/groups/${activeSlug}/invite`, {
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
      return apiRequest(`/groups/${activeSlug}/members/${userId}/role`, {
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
      return apiRequest(`/groups/${activeSlug}/members/${userId}`, {
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
      return apiRequest(`/groups/${activeSlug}/applications/${applicationId}`, {
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

  const deleteApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      return apiRequest(`/groups/${activeSlug}/applications/${applicationId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: 'Application deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'details'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete application.', variant: 'destructive' });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async ({ ideaId, score, feedback }: { ideaId: string; score: number; feedback?: string }) => {
      return apiRequest(`/groups/${activeSlug}/ideas/${ideaId}/rate`, {
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

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await fetch(`/api/groups/${activeSlug}/logo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Logo updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'details'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/groups/${activeSlug}/logo`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(err.error || 'Delete failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Logo removed' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'details'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a JPEG, PNG, or WebP image.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB.', variant: 'destructive' });
      return;
    }
    logoMutation.mutate(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const updateGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; primaryColor: string; accentColor: string; autoApprove?: boolean; applicationDeadline?: string | null }) => {
      const payload: any = { ...data };
      if (payload.applicationDeadline === '') payload.applicationDeadline = null;
      return apiRequest(`/groups/${activeSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast({ title: 'Group settings updated' });
      setIsEditingOverview(false);
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'details'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/my-groups'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return apiRequest(`/groups/${activeSlug}/invites/${inviteId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: 'Invite revoked' });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'invites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', activeSlug, 'details'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to revoke invite', variant: 'destructive' });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return apiRequest(`/groups/${activeSlug}/invites/${inviteId}/resend`, { method: 'POST' });
    },
    onSuccess: () => {
      toast({ title: 'Invite resent', description: 'A reminder email has been sent.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to resend invite', variant: 'destructive' });
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

  const exportApplicationsCSV = () => {
    if (!applications || applications.length === 0) return;
    const allQuestions = new Set<string>();
    for (const app of applications) {
      if (app.answers) {
        for (const a of app.answers) {
          allQuestions.add(a.question);
        }
      }
    }
    const questionCols = Array.from(allQuestions);

    const headers = [
      'Name', 'Email', 'University', 'Graduation Year', 'Major',
      'Project Title', 'Team Members', 'Status', 'Submitted',
      ...questionCols
    ];

    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = applications.map(app => {
      const answerMap: Record<string, string> = {};
      if (app.answers) {
        for (const a of app.answers) {
          answerMap[a.question] = (a.answer || '').replace(/\|\|\|/g, '; ');
        }
      }
      return [
        app.user.fullName || '',
        app.user.email,
        app.universityName || app.profile?.university || '',
        app.graduationYear || '',
        app.major || '',
        app.projectTitle || '',
        app.teamEmails?.join('; ') || '',
        app.status,
        new Date(app.createdAt).toLocaleDateString(),
        ...questionCols.map(q => answerMap[q] || '')
      ].map(v => escapeCSV(String(v)));
    });

    const csv = [headers.map(h => escapeCSV(h)).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

  const isJudge = myRole === 'judge';
  const defaultTab = isJudge ? 'ideas' : 'overview';
  const groupLoginUrl = group ? `yassu.ai/${group.slug}/auth` : '';
  const brandPrimary = group?.primaryColor || undefined;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6" data-testid="group-admin-page">
      {detailsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : group ? (
        <>
        <div className="rounded-xl border overflow-hidden" style={brandPrimary ? { borderColor: `hsl(${brandPrimary} / 0.2)` } : undefined}>
          <div className="p-5 flex items-center gap-5" style={brandPrimary ? { background: `linear-gradient(135deg, hsl(${brandPrimary} / 0.08), hsl(${brandPrimary} / 0.03))` } : undefined}>
            <div className="shrink-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted border flex items-center justify-center" style={brandPrimary ? { borderColor: `hsl(${brandPrimary} / 0.3)` } : undefined}>
                {group.logoUrl ? (
                  <img src={group.logoUrl} alt={group.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-muted-foreground">{group.name?.[0]?.toUpperCase()}</span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold truncate" data-testid="text-group-admin-title">{group.name}</h1>
                <Badge variant="outline" className="text-xs shrink-0" style={brandPrimary ? { borderColor: `hsl(${brandPrimary} / 0.4)`, color: `hsl(${brandPrimary})` } : undefined}>
                  {isJudge ? 'Judge' : myRole === 'owner' ? 'Owner' : 'Admin'}
                </Badge>
              </div>
              {group.description ? (
                <div className="group-description text-sm text-muted-foreground mt-0.5 max-w-none line-clamp-3" dangerouslySetInnerHTML={{ __html: group.description.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ') }} />
              ) : (
                <p className="text-sm text-muted-foreground mt-0.5">No description</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                <code className="text-xs font-mono bg-background/80 px-2 py-0.5 rounded border select-all">{groupLoginUrl}</code>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { navigator.clipboard.writeText(`https://${groupLoginUrl}`); toast({ title: 'Link copied' }); }}
                  data-testid="button-copy-group-url"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {myGroups && myGroups.length > 1 && (
              <Select value={activeSlug || ''} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-[180px] shrink-0" data-testid="select-group">
                  <SelectValue placeholder="Switch group" />
                </SelectTrigger>
                <SelectContent>
                  {myGroups.map(g => (
                    <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          {isJudge ? (
            <TabsList className="grid w-full grid-cols-1 max-w-[200px]" data-testid="group-admin-tabs">
              <TabsTrigger value="ideas" data-testid="tab-ideas">Ideas & Ratings</TabsTrigger>
            </TabsList>
          ) : (
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
          )}

          {!isJudge && <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                <Card data-testid="card-member-count" className="border-l-4" style={brandPrimary ? { borderLeftColor: `hsl(${brandPrimary})` } : undefined}>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-sm text-muted-foreground">Members</p>
                    <p className="text-2xl font-bold mt-1">{group.memberCount}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card data-testid="card-idea-count" className="border-l-4" style={brandPrimary ? { borderLeftColor: `hsl(${brandPrimary})` } : undefined}>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-sm text-muted-foreground">Ideas</p>
                    <p className="text-2xl font-bold mt-1">{group.ideaCount}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card data-testid="card-applicant-count" className="border-l-4" style={brandPrimary ? { borderLeftColor: `hsl(${brandPrimary})` } : undefined}>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-sm text-muted-foreground">Pending Applicants</p>
                    <p className="text-2xl font-bold mt-1">{pendingApplications.length}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card data-testid="card-invite-count" className="border-l-4" style={brandPrimary ? { borderLeftColor: `hsl(${brandPrimary})` } : undefined}>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-sm text-muted-foreground">Pending Invites</p>
                    <p className="text-2xl font-bold mt-1">{group.pendingInviteCount}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {myApplicationData?.application && (
              <Card data-testid="card-my-application">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base">My Application</CardTitle>
                    <CardDescription>
                      {myApplicationData.application.status === 'draft' && 'Your application is saved but not yet submitted.'}
                      {myApplicationData.application.status === 'pending' && 'Your application is under review.'}
                      {myApplicationData.application.status === 'approved' && 'Your application has been approved!'}
                      {myApplicationData.application.status === 'rejected' && 'Your application was not accepted.'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={
                        myApplicationData.application.status === 'draft' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200' :
                        myApplicationData.application.status === 'pending' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200' :
                        myApplicationData.application.status === 'approved' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200' :
                        'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200'
                      }
                      data-testid="badge-my-app-status"
                    >
                      {myApplicationData.application.status === 'draft' ? 'Draft' :
                       myApplicationData.application.status === 'pending' ? 'Under Review' :
                       myApplicationData.application.status === 'approved' ? 'Approved' : 'Rejected'}
                    </Badge>
                    <Button
                      size="sm"
                      variant={myApplicationData.application.status === 'draft' ? 'default' : 'outline'}
                      onClick={() => navigate(`/portal/applications/${activeSlug}`)}
                      data-testid="button-view-my-application"
                    >
                      {myApplicationData.application.status === 'draft' ? 'Continue Application' :
                       (myApplicationData.application.status === 'pending') ? 'Edit Application' : 'View Application'}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Group Settings</CardTitle>
                {myRole !== 'judge' && (
                  <Button size="sm" variant={isEditingOverview ? 'default' : 'outline'} onClick={() => {
                    if (isEditingOverview) { setIsEditingOverview(false); } else {
                      setEditForm({
                        name: group.name || '',
                        description: group.description || '',
                        primaryColor: group.primaryColor || '',
                        accentColor: group.accentColor || '',
                        autoApprove: !!group.autoApprove,
                        applicationDeadline: group.applicationDeadline ? new Date(group.applicationDeadline).toISOString().slice(0, 16) : '',
                      });
                      setIsEditingOverview(true);
                    }
                  }} data-testid="button-toggle-edit-overview">
                    <Edit className="w-4 h-4 mr-1" /> {isEditingOverview ? 'Cancel' : 'Edit'}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  <div className="shrink-0">
                    <div className="relative group/logo">
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/20 overflow-hidden bg-muted flex items-center justify-center">
                        {group.logoUrl ? (
                          <img src={group.logoUrl} alt={`${group.name} logo`} className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                        )}
                      </div>
                      {myRole !== 'judge' && (
                        <button
                          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => logoInputRef.current?.click()}
                          data-testid="button-upload-logo"
                        >
                          {logoMutation.isPending ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <Camera className="w-5 h-5 text-white" />
                          )}
                        </button>
                      )}
                      {myRole !== 'judge' && group.logoUrl && (
                        <button
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80 transition-colors"
                          onClick={() => deleteLogoMutation.mutate()}
                          disabled={deleteLogoMutation.isPending}
                          data-testid="button-delete-logo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                        data-testid="input-logo-upload"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-1">Logo</p>
                  </div>
                  {isEditingOverview ? (
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Group Name</label>
                        <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} data-testid="input-edit-overview-name" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Description</label>
                        <Suspense fallback={<div className="h-[160px] border rounded-lg animate-pulse bg-muted" />}>
                          <RichTextEditor
                            value={editForm.description}
                            onChange={(val) => setEditForm({ ...editForm, description: val })}
                            placeholder="Describe your group..."
                            data-testid="input-edit-overview-desc"
                          />
                        </Suspense>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Application Deadline (optional)</label>
                        <Input
                          type="datetime-local"
                          value={editForm.applicationDeadline}
                          onChange={e => setEditForm({ ...editForm, applicationDeadline: e.target.value })}
                          data-testid="input-edit-overview-deadline"
                        />
                        <p className="text-[11px] text-muted-foreground">After this date and time, no new applications can be submitted and existing applications become read-only.</p>
                      </div>
                      <div className="flex items-start gap-2 pt-1">
                        <input
                          id="auto-approve-toggle"
                          type="checkbox"
                          className="mt-1"
                          checked={editForm.autoApprove}
                          onChange={e => setEditForm({ ...editForm, autoApprove: e.target.checked })}
                          data-testid="input-edit-overview-auto-approve"
                        />
                        <div>
                          <label htmlFor="auto-approve-toggle" className="text-sm font-medium cursor-pointer">Auto-approve all applications</label>
                          <p className="text-[11px] text-muted-foreground">When enabled, new applicants are automatically approved and added as group members.</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" disabled={updateGroupMutation.isPending} onClick={() => updateGroupMutation.mutate({
                          ...editForm,
                          applicationDeadline: editForm.applicationDeadline ? new Date(editForm.applicationDeadline).toISOString() : null,
                        })} data-testid="button-save-overview">
                          {updateGroupMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save Changes
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditingOverview(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{group.name}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Description</p>
                        {group.description ? (
                          <div className="group-description text-muted-foreground text-sm max-w-none" dangerouslySetInnerHTML={{ __html: group.description.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ') }} />
                        ) : (
                          <p className="text-muted-foreground">No description set</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Application Deadline</p>
                          <p className="font-medium" data-testid="text-deadline">
                            {group.applicationDeadline
                              ? new Date(group.applicationDeadline).toLocaleString()
                              : 'No deadline'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Auto-approve</p>
                          <p className="font-medium" data-testid="text-auto-approve">{group.autoApprove ? 'Enabled' : 'Disabled'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Application Questionnaire</CardTitle>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {window.location.origin}/apply/{group.slug}
                    </code>
                    <Button size="sm" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/apply/${group.slug}`);
                      toast({ title: 'Link copied!' });
                    }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <CardDescription>Configure the questions applicants must answer. Changes save automatically.</CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationQuestionsEditor slug={group.slug} />
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Post-Submission Settings</CardTitle>
                <CardDescription>Customize what applicants see after submitting their application.</CardDescription>
              </CardHeader>
              <CardContent>
                <SubmissionSettingsEditor slug={group.slug} group={group} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['/api/groups', group.slug, 'details'] })} />
              </CardContent>
            </Card>
          </TabsContent>}

          {!isJudge && <TabsContent value="applicants" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{applications?.length || 0} total</Badge>
                {pendingApplications.length > 0 && (
                  <Badge variant="destructive">{pendingApplications.length} pending</Badge>
                )}
              </div>
              {applications && applications.length > 0 && (
                <Button size="sm" variant="outline" onClick={exportApplicationsCSV} data-testid="button-export-csv">
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
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
                                variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : app.status === 'draft' ? 'outline' : 'secondary'}
                              >
                                {app.status === 'draft' && <Edit className="h-3 w-3 mr-1" />}
                                {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                {app.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                {app.status === 'draft' ? 'Draft' : app.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{app.user.email}</p>
                            {(app.universityName || app.profile?.university) && (
                              <p className="text-sm text-muted-foreground mt-0.5">{app.universityName || app.profile?.university}</p>
                            )}
                            {(app.graduationYear || app.major) && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {[app.major, app.graduationYear ? `Class of ${app.graduationYear}` : ''].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {app.projectTitle && (
                              <p className="text-sm font-medium mt-1">Project: {app.projectTitle}</p>
                            )}
                            {app.teamEmails && app.teamEmails.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {app.teamEmails.map((em, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{em}</Badge>
                                ))}
                              </div>
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
                            {app.answers && app.answers.length > 0 ? (
                              <div className="mt-2 space-y-2">
                                {app.answers.map((a, idx) => {
                                  const fileMatch = a.answer?.match(/^\[file:(.+?)\](\/objects\/.+)$/);
                                  return (
                                    <div key={idx} className="p-2 rounded bg-muted text-sm">
                                      <p className="text-xs text-muted-foreground mb-0.5 font-medium">{a.question}</p>
                                      {fileMatch ? (
                                        <a href={fileMatch[2]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline" data-testid={`link-file-${idx}`}>
                                          <FileText className="h-4 w-4" />
                                          {fileMatch[1] || 'Download file'}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : a.answer?.includes('|||') ? (
                                        <div className="flex flex-wrap gap-1">
                                          {a.answer.split('|||').filter(Boolean).map((val, vIdx) => (
                                            <Badge key={vIdx} variant="secondary" className="text-xs">{val}</Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="whitespace-pre-wrap">{a.answer}</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : app.motivation ? (
                              <div className="mt-2 p-2 rounded bg-muted text-sm">
                                <p className="text-xs text-muted-foreground mb-0.5 font-medium">Motivation</p>
                                {app.motivation}
                              </div>
                            ) : null}
                            <p className="text-xs text-muted-foreground mt-1">
                              Applied {new Date(app.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {(app.status === 'pending' || app.status === 'draft') && (
                            <>
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
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Permanently delete the application from ${app.user?.fullName || app.user?.email || 'this applicant'}? This cannot be undone.`)) {
                                deleteApplicationMutation.mutate(app.id);
                              }
                            }}
                            disabled={deleteApplicationMutation.isPending}
                            data-testid={`button-delete-application-${app.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
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
          </TabsContent>}

          {!isJudge && <TabsContent value="members" className="space-y-4">
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
          </TabsContent>}

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

          {!isJudge && <TabsContent value="invites" className="space-y-6">
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
                <CardTitle className="text-lg">My Invitations</CardTitle>
                <CardDescription>
                  {invites?.length || 0} invitation{(invites?.length || 0) !== 1 ? 's' : ''} sent by you
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
                        <div className="flex items-center gap-2">
                          {invite.status === 'pending' && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Resend invite"
                                disabled={resendInviteMutation.isPending}
                                onClick={() => resendInviteMutation.mutate(invite.id)}
                                data-testid={`button-resend-${invite.id}`}
                              >
                                <RotateCw className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                title="Revoke invite"
                                disabled={revokeInviteMutation.isPending}
                                onClick={() => revokeInviteMutation.mutate(invite.id)}
                                data-testid={`button-revoke-${invite.id}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <Badge
                            variant={invite.status === 'accepted' ? 'default' : invite.status === 'expired' ? 'destructive' : 'secondary'}
                          >
                            {invite.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {invite.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {invite.status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                            {invite.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6">No invitations sent yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>}
        </Tabs>
        </>
      ) : null}
    </div>
  );
}

function ApplicationQuestionsEditor({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<{ label: string; type: string; required: boolean; options?: string[] }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<{ applicationQuestions: any[] }>(`/groups/${slug}/public-info`);
        setQuestions(data.applicationQuestions || []);
      } catch { /* ignore */ }
      setLoaded(true);
    }
    load();
  }, [slug]);

  const save = async (updated: typeof questions) => {
    try {
      setSaving(true);
      const sanitized = updated.map(q => ({
        ...q,
        label: q.label.trim(),
        options: q.options ? q.options.map(o => o.trim()).filter(Boolean) : undefined,
      }));
      await apiRequest(`/groups/${slug}/application-questions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationQuestions: sanitized }),
      });
      toast({ title: 'Questions saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const addQuestion = () => {
    const updated = [...questions, { label: '', type: 'textarea' as const, required: true, options: [] as string[] }];
    setQuestions(updated);
  };

  const needsOptions = (type: string) => type === 'radio' || type === 'checkbox' || type === 'dropdown';

  const addOption = (idx: number) => {
    const q = questions[idx];
    const opts = [...(q.options || []), ''];
    updateQuestion(idx, 'options', opts);
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    const q = questions[qIdx];
    const opts = (q.options || []).map((o, i) => i === optIdx ? value : o);
    updateQuestion(qIdx, 'options', opts);
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    const q = questions[qIdx];
    const opts = (q.options || []).filter((_, i) => i !== optIdx);
    updateQuestion(qIdx, 'options', opts);
  };

  const removeQuestion = (idx: number) => {
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    save(updated);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = questions.map((q, i) => i === idx ? { ...q, [field]: value } : q);
    setQuestions(updated);
  };

  if (!loaded) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="flex items-start gap-2 p-3 border rounded-lg bg-background">
          <div className="flex-1 space-y-2">
            <Input
              value={q.label}
              onChange={e => updateQuestion(i, 'label', e.target.value)}
              placeholder="Question text..."
              className="text-sm"
              data-testid={`input-question-label-${i}`}
            />
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={q.required} onChange={e => { updateQuestion(i, 'required', e.target.checked); }} />
                Required
              </label>
              <select
                value={q.type}
                onChange={e => {
                  const newType = e.target.value;
                  const updated = questions.map((qq, idx) => {
                    if (idx !== i) return qq;
                    const patch: Record<string, any> = { type: newType };
                    if (needsOptions(newType) && (!qq.options || qq.options.length === 0)) {
                      patch.options = ['Option 1', 'Option 2'];
                    }
                    return { ...qq, ...patch };
                  });
                  setQuestions(updated);
                }}
                className="border rounded px-2 py-0.5 text-xs bg-background"
              >
                <option value="text">Short text</option>
                <option value="textarea">Long text</option>
                <option value="file">File upload</option>
                <option value="radio">Multiple choice</option>
                <option value="checkbox">Checkboxes (select all that apply)</option>
                <option value="dropdown">Dropdown</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="url">URL / Link</option>
              </select>
            </div>
            {needsOptions(q.type) && (
              <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-muted">
                <p className="text-xs text-muted-foreground font-medium">Options:</p>
                {(q.options || []).map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground w-4">{optIdx + 1}.</span>
                    <Input
                      value={opt}
                      onChange={e => updateOption(i, optIdx, e.target.value)}
                      placeholder={`Option ${optIdx + 1}`}
                      className="text-xs h-7 flex-1"
                      data-testid={`input-option-${i}-${optIdx}`}
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeOption(i, optIdx)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => addOption(i)} data-testid={`button-add-option-${i}`}>
                  + Add option
                </Button>
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => removeQuestion(i)} className="shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={addQuestion} data-testid="button-add-question">
          + Add Question
        </Button>
        <Button size="sm" onClick={() => save(questions)} disabled={saving} data-testid="button-save-questions">
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Save Questions
        </Button>
      </div>
    </div>
  );
}

function SubmissionSettingsEditor({ slug, group, onUpdate }: { slug: string; group: GroupDetails; onUpdate: () => void }) {
  const { toast } = useToast();
  const [redirectUrl, setRedirectUrl] = useState(group.redirectUrl || '');
  const [submissionMessage, setSubmissionMessage] = useState(group.submissionMessage || '');
  const [submissionFileUrl, setSubmissionFileUrl] = useState(group.submissionFileUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest(`/groups/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ redirectUrl: redirectUrl || null, submissionMessage: submissionMessage || null, submissionFileUrl: submissionFileUrl || null }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast({ title: 'Submission settings saved' });
      onUpdate();
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'File type not supported', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File must be under 10MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await apiRequest<{ uploadURL: string; objectPath: string }>('/uploads/request-url', {
        method: 'POST',
        body: JSON.stringify({ name: file.name, contentType: file.type, size: file.size }),
        headers: { 'Content-Type': 'application/json' },
      });
      await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setSubmissionFileUrl(objectPath);
      toast({ title: 'File uploaded' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Redirect URL (after submission)</label>
        <Input
          placeholder="https://example.com/thank-you or leave blank for default"
          value={redirectUrl}
          onChange={(e) => setRedirectUrl(e.target.value)}
          data-testid="input-redirect-url"
        />
        <p className="text-xs text-muted-foreground">If set, applicants will see a button to visit this URL after submitting. Use your group's home page or a custom thank-you page.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Custom Submission Message</label>
        <Textarea
          placeholder="Thank you for applying! We'll review your application shortly."
          value={submissionMessage}
          onChange={(e) => setSubmissionMessage(e.target.value)}
          rows={3}
          data-testid="input-submission-message"
        />
        <p className="text-xs text-muted-foreground">Replaces the default "Your application is under review" message on the confirmation page.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Submission Page File/Image</label>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-upload-submission-file">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
            Upload File
          </Button>
          {submissionFileUrl && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <a href={submissionFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline" data-testid="link-submission-file">
                View file
              </a>
              <Button size="sm" variant="ghost" onClick={() => setSubmissionFileUrl('')} className="h-6 w-6 p-0">
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Optional image or document shown on the submission confirmation page (e.g., welcome flyer, next steps PDF).</p>
      </div>

      <Button onClick={handleSave} disabled={saving} data-testid="button-save-submission-settings">
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
        Save Settings
      </Button>
    </div>
  );
}