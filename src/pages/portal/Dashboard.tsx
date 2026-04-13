import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { WelcomeModal } from '@/components/portal/WelcomeModal';
import {
  Lightbulb,
  Users,
  UserPlus,
  Check,
  X,
  ExternalLink,
  Plus,
  GraduationCap,
  Briefcase,
  Link2,
  MessageSquare,
  User,
  ArrowRight,
  Sparkles,
  Compass,
  Search,
  Rocket,
  Share2,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ShareInviteModal } from '@/components/portal/ShareInviteModal';
interface Profile {
  id: number;
  userId: number;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  universityId: string | null;
  major: string | null;
  graduationYear: number | null;
  skills: string[] | null;
  interests: string[] | null;
  availability: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  bio: string | null;
  yassuRole: 'ambassador' | 'advisor' | null;
}

interface Idea {
  id: string;
  createdBy: number;
  title: string;
  problem: string;
  solution: string | null;
  targetUser: string | null;
  whyNow: string | null;
  assumptions: string | null;
  desiredTeammates: string | null;
  expectedTimeline: string | null;
  stage: 'idea_posted' | 'business_plan' | 'find_advisors' | 'form_team' | 'build_mvp' | 'yassu_foundry' | 'launched' | null;
  universityId: string | null;
  isPublic: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface JoinRequest {
  id: string;
  userId: number;
  ideaId: string | null;
  message: string | null;
  status: string | null;
  createdAt: string;
  requester: Profile;
  idea: Idea;
}

interface Connection {
  id: string;
  requesterId: number;
  recipientId: number;
  status: string;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  profile: Profile;
}

interface GroupApplication {
  id: string;
  groupId: string;
  userId: number;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  groupName: string;
  groupSlug: string;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const brand = useBranding();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [potentialMembers, setPotentialMembers] = useState<Profile[]>([]);
  const [myConnections, setMyConnections] = useState<Connection[]>([]);
  const [myGroupApplications, setMyGroupApplications] = useState<GroupApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);
  const [invitingUserId, setInvitingUserId] = useState<number | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteIdeaId, setInviteIdeaId] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  
  // Join request review states
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'accepted' | 'rejected' | 'pending' | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // First fetch ideas
        const ideas = await fetch('/api/my-ideas', { credentials: 'include' }).then(r => r.ok ? r.json() : []);
        setMyIdeas(ideas);
        
        // Get the most recent idea for intelligent matching
        const mostRecentIdea = ideas.length > 0 ? ideas[0] : null;
        const ideaIdParam = mostRecentIdea ? `?ideaId=${mostRecentIdea.id}` : '';
        
        const [requests, members, connections, groupApps] = await Promise.all([
          fetch('/api/join-requests', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
          fetch(`/api/profiles/potential-team${ideaIdParam}`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
          fetch('/api/connections', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
          fetch('/api/my-group-applications', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
        ]);
        
        setJoinRequests(requests);
        setPotentialMembers(members);
        setMyConnections(connections);
        setMyGroupApplications(groupApps);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleJoinRequestAction = async (requestId: string, status: 'accepted' | 'rejected' | 'pending', customMessage?: string) => {
    setProcessingAction(true);
    try {
      await fetch(`/api/join-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, customMessage }),
      });
      
      if (status !== 'pending') {
        setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      }
      
      const statusLabels = {
        accepted: 'Request accepted',
        rejected: 'Request declined',
        pending: 'Response sent'
      };
      const statusDescriptions = {
        accepted: 'The collaborator has been notified and added to your team.',
        rejected: 'The collaborator has been notified of your decision.',
        pending: 'Your message has been sent to the collaborator.'
      };
      
      toast({
        title: statusLabels[status],
        description: statusDescriptions[status],
      });
      
      setActionDialogOpen(false);
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setActionType(null);
      setActionMessage('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update request', variant: 'destructive' });
    } finally {
      setProcessingAction(false);
    }
  };

  const openReviewDialog = (request: JoinRequest) => {
    setSelectedRequest(request);
    setReviewDialogOpen(true);
  };

  const openActionDialog = (type: 'accepted' | 'rejected' | 'pending') => {
    setActionType(type);
    // Set default message templates
    const requesterName = selectedRequest?.requester.fullName || 'there';
    const ideaTitle = selectedRequest?.idea.title || 'the project';
    
    const templates = {
      accepted: `Hi ${requesterName},\n\nWelcome to the team! I'm excited to have you join ${ideaTitle}. Let's connect soon to discuss next steps and how you can contribute.\n\nLooking forward to working together!`,
      rejected: `Hi ${requesterName},\n\nThank you for your interest in ${ideaTitle}. After careful consideration, we've decided to move forward with other candidates whose skills more closely match our current needs.\n\nWe appreciate your enthusiasm and wish you the best in your future endeavors. Keep exploring other opportunities on the platform!`,
      pending: `Hi ${requesterName},\n\nThank you for your interest in ${ideaTitle}. We're still reviewing applications and would like to take a bit more time to make our decision.\n\nWe'll be in touch soon with an update. Thanks for your patience!`
    };
    
    setActionMessage(templates[type]);
    setActionDialogOpen(true);
  };

  const getInviteMessageTemplate = (name: string | null, ideaTitle: string, skills?: string[] | null) => {
    const displayName = name || 'there';
    const skillsText = skills && skills.length > 0 ? `Your expertise in ${skills.slice(0, 2).join(' and ')} caught my attention. ` : '';
    
    return `Hi ${displayName},

I came across your profile and found your experience and skillsets really valuable for our project "${ideaTitle}". ${skillsText}I believe we could learn a lot from your guidance and mentorship.

Would you be interested in joining us? I'd love to discuss how we can work together.

Looking forward to hearing from you!`;
  };

  const handleOpenInviteDialog = (member: Profile, ideaId?: string) => {
    setSelectedProfile(member);
    
    if (ideaId) {
      const idea = myIdeas.find(i => i.id === ideaId);
      setInviteIdeaId(ideaId);
      setInviteMessage(getInviteMessageTemplate(member.fullName, idea?.title || 'our startup', member.skills));
    } else if (myIdeas.length === 1) {
      setInviteIdeaId(myIdeas[0].id);
      setInviteMessage(getInviteMessageTemplate(member.fullName, myIdeas[0].title, member.skills));
    } else {
      setInviteIdeaId(null);
      setInviteMessage('');
    }
    
    setInviteDialogOpen(true);
  };

  const handleSelectIdea = (ideaId: string) => {
    setInviteIdeaId(ideaId);
    const idea = myIdeas.find(i => i.id === ideaId);
    if (selectedProfile && idea) {
      setInviteMessage(getInviteMessageTemplate(selectedProfile.fullName, idea.title, selectedProfile.skills));
    }
  };

  const handleSendInvite = async () => {
    if (!selectedProfile || !inviteIdeaId) return;
    
    setSendingInvite(true);
    try {
      const response = await fetch('/api/team-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          ideaId: inviteIdeaId, 
          inviteeId: selectedProfile.userId,
          message: inviteMessage,
        }),
      });
      
      if (response.ok) {
        setSentInvites(prev => new Set([...prev, `${selectedProfile.userId}-${inviteIdeaId}`]));
        setInviteDialogOpen(false);
        setSelectedProfile(null);
        setInviteMessage('');
        setInviteIdeaId(null);
        toast({
          title: 'Invitation sent!',
          description: `Your invitation has been sent to ${selectedProfile.fullName || 'the user'}.`,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send invitation');
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send invite', 
        variant: 'destructive' 
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleInvite = async (inviteeId: number, ideaId: string) => {
    const member = potentialMembers.find(m => m.userId === inviteeId);
    if (member) {
      handleOpenInviteDialog(member, ideaId);
    }
  };

  const isAlreadyInvited = (userId: number, ideaId: string) => {
    return sentInvites.has(`${userId}-${ideaId}`);
  };

  const stageColors: Record<string, string> = {
    idea_posted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    business_plan: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    find_advisors: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    form_team: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    build_mvp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    yassu_foundry: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
    launched: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  };

  const stageLabels: Record<string, string> = {
    idea_posted: 'Post Idea',
    business_plan: 'Business Plan',
    find_advisors: 'Find Advisors and Collaborators',
    form_team: 'Form Team',
    build_mvp: 'Build MVP',
    yassu_foundry: 'Foundry',
    launched: 'Launched',
  };

  const stageOrder = ['idea_posted', 'business_plan', 'find_advisors', 'form_team', 'build_mvp', 'yassu_foundry', 'launched'];
  
  const getStageNumber = (stage: string | null) => {
    const index = stageOrder.indexOf(stage || 'idea_posted');
    return index >= 0 ? index + 1 : 1;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Check if profile is incomplete (missing key fields)
  const isProfileIncomplete = !profile?.bio || 
    !profile?.skills?.length || 
    !profile?.interests?.length ||
    !profile?.universityId;

  return (
    <>
      <WelcomeModal />
      <div className="space-y-8" data-tour="welcome">
      {/* Profile Completion Prompt */}
      {isProfileIncomplete && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">Complete Your Profile</h3>
                  <p className="text-sm text-muted-foreground">
                    Add your skills, interests, and bio to help others find you and build your team.
                  </p>
                </div>
                <Button onClick={() => navigate('/portal/profile')} data-testid="button-complete-profile">
                  Complete Profile
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!loading && brand.navLabels.apply && (() => {
        const draftApp = myGroupApplications.find(a => a.groupSlug === brand.id && a.status === 'draft');
        const hasAnyApp = myGroupApplications.some(a => a.groupSlug === brand.id);
        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-amber-300/40 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/20 dark:border-amber-700/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Rocket className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{brand.navLabels.apply}</h3>
                    <p className="text-sm text-muted-foreground">
                      {draftApp
                        ? 'You have a draft application saved. Complete and submit it to participate!'
                        : hasAnyApp
                        ? 'Submit another startup idea to the competition.'
                        : `Complete your ${brand.name} application to unlock pitch competitions and resources.`}
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate(`/apply/${brand.id}`)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    data-testid={`button-apply-${brand.id}`}
                  >
                    {draftApp ? 'Continue Application' : hasAnyApp ? 'New Application' : 'Apply Now'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-welcome" data-tour="dashboard-header">
          Welcome{isProfileIncomplete ? '' : ' back'}, {profile?.fullName?.split(' ')[0] || 'Founder'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {isProfileIncomplete 
            ? 'Get started by completing your profile to connect with others.'
            : 'Manage your ideas and build your team.'}
        </p>
      </motion.div>

      {/* Group Applications Section */}
      {!loading && myGroupApplications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    My Applications
                  </CardTitle>
                  <CardDescription>Your group application status</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/apply/${brand.id}`)}
                  data-testid="button-new-application-header"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Application
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myGroupApplications.map((app) => (
                  <div
                    key={app.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      app.status === 'draft'
                        ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800'
                        : 'border-border hover:border-primary/20 hover:bg-muted/50'
                    }`}
                    data-testid={`card-group-application-${app.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          app.status === 'approved' ? 'bg-green-500/10' :
                          app.status === 'rejected' ? 'bg-red-500/10' :
                          app.status === 'draft' ? 'bg-blue-500/10' :
                          'bg-amber-500/10'
                        }`}>
                          {app.status === 'approved' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : app.status === 'rejected' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : app.status === 'draft' ? (
                            <ClipboardCheck className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium truncate" data-testid={`text-app-group-${app.id}`}>{app.groupName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {app.status === 'draft' ? 'Saved — not yet submitted' : `Applied ${new Date(app.createdAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {app.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/portal/applications/${app.groupSlug}`)}
                            data-testid={`button-continue-app-${app.id}`}
                          >
                            Continue
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                        {app.status === 'pending' && (
                          <>
                            <Badge
                              className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200"
                              variant="outline"
                              data-testid={`badge-app-status-${app.id}`}
                            >
                              Under Review
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/portal/applications/${app.groupSlug}`)}
                              data-testid={`button-edit-app-${app.id}`}
                            >
                              Edit
                            </Button>
                          </>
                        )}
                        {(app.status === 'approved' || app.status === 'rejected') && (
                          <>
                            <Badge
                              className={
                                app.status === 'approved' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200' :
                                'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200'
                              }
                              variant="outline"
                              data-testid={`badge-app-status-${app.id}`}
                            >
                              {app.status === 'approved' ? 'Approved' : 'Rejected'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/portal/applications/${app.groupSlug}`)}
                              data-testid={`button-view-app-${app.id}`}
                            >
                              View
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Get Started Section (for users without ideas) */}
      {!loading && myIdeas.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                Get Started
              </CardTitle>
              <CardDescription>Join an existing project or create your own startup idea</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Search className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className="font-semibold">Browse Ideas</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Explore startup ideas in the marketplace and apply to join a team that matches your skills and interests.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/portal/ideas')}
                    data-testid="button-browse-ideas"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Browse Ideas Marketplace
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                
                <div className="p-6 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-purple-500" />
                    </div>
                    <h3 className="font-semibold">Create Your Own</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Have a startup idea? Post it and find co-founders who can help bring your vision to life.
                  </p>
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    onClick={() => navigate('/portal/ideas/new')}
                    data-testid="button-create-idea"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Post Your Idea
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Section 1: My Ideas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2" data-tour="my-ideas">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                My Ideas
              </CardTitle>
              <CardDescription>Your startup ideas and their current stage</CardDescription>
            </div>
            <Button 
              onClick={() => navigate('/portal/ideas/new')} 
              data-testid="button-new-idea" 
              data-tour="new-idea-button"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Post New Idea
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : myIdeas.length > 0 ? (
              <div className="space-y-3">
                {myIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="p-4 rounded-lg border border-border hover:border-primary/20 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/portal/ideas/${idea.id}`)}
                    data-testid={`card-my-idea-${idea.id}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-medium">{idea.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Stage {getStageNumber(idea.stage)} of 7
                        </span>
                        <Badge className={stageColors[idea.stage || 'idea_posted'] || 'bg-muted'}>
                          {stageLabels[idea.stage || 'idea_posted'] || 'Post Idea'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {idea.problem}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No ideas yet. Post your first startup idea!</p>
                <Button onClick={() => navigate('/portal/ideas/new')} data-testid="button-post-first-idea">
                  <Plus className="w-4 h-4 mr-2" />
                  Post an Idea
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 2: Team Join Requests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Team Join Requests
            </CardTitle>
            <CardDescription>Collaborators requesting to join your ideas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : joinRequests.length > 0 ? (
              <div className="space-y-3">
                {joinRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg border border-border"
                    data-testid={`card-join-request-${request.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <Avatar 
                        className="w-12 h-12 cursor-pointer"
                        onClick={() => setSelectedProfile(request.requester)}
                        data-testid={`avatar-requester-${request.requester.userId}`}
                      >
                        <AvatarImage src={request.requester.avatarUrl || undefined} />
                        <AvatarFallback>{getInitials(request.requester.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span 
                            className="font-medium cursor-pointer hover:text-primary"
                            onClick={() => setSelectedProfile(request.requester)}
                            data-testid={`text-requester-name-${request.requester.userId}`}
                          >
                            {request.requester.fullName || 'Unknown'}
                          </span>
                          {request.requester.yassuRole && (
                            <Badge variant="secondary" className="text-xs">
                              {request.requester.yassuRole === 'ambassador' ? (
                                <><GraduationCap className="w-3 h-3 mr-1" /> Ambassador</>
                              ) : (
                                <><Briefcase className="w-3 h-3 mr-1" /> Advisor</>
                              )}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Wants to join: <span className="font-medium">{request.idea.title}</span>
                        </p>
                        {request.message && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            "{request.message}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReviewDialog(request)}
                          data-testid={`button-review-${request.id}`}
                        >
                          <User className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No pending join requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 3: People to Invite (only when user has ideas) */}
      {myIdeas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                People to Invite
              </CardTitle>
              <CardDescription>Smart matches based on skills and interests relevant to your ideas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : potentialMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {potentialMembers.map((member) => (
                    <div
                      key={member.userId}
                      className="p-4 rounded-lg border border-border hover:border-primary/20 transition-colors"
                      data-testid={`card-potential-member-${member.userId}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar 
                          className="w-10 h-10 cursor-pointer"
                          onClick={() => {
                            setSelectedProfile(member);
                            setInviteDialogOpen(true);
                          }}
                          data-testid={`avatar-member-${member.userId}`}
                        >
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback>{getInitials(member.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span 
                            className="font-medium cursor-pointer hover:text-primary block truncate"
                            onClick={() => {
                              setSelectedProfile(member);
                              setInviteDialogOpen(true);
                            }}
                            data-testid={`text-member-name-${member.userId}`}
                          >
                            {member.fullName || 'Unknown'}
                          </span>
                          {member.yassuRole && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {member.yassuRole === 'ambassador' ? (
                                <><GraduationCap className="w-3 h-3 mr-1" /> Ambassador</>
                              ) : (
                                <><Briefcase className="w-3 h-3 mr-1" /> Advisor</>
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {member.skills && member.skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {member.skills.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {member.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      {myIdeas.some(idea => isAlreadyInvited(member.userId, idea.id)) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full mt-3"
                          disabled
                          data-testid={`button-invited-${member.userId}`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Invited
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => handleOpenInviteDialog(member)}
                          disabled={invitingUserId === member.userId}
                          data-testid={`button-invite-${member.userId}`}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Invite
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No advisors or ambassadors available to invite</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Section 4: My Connections */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5 text-indigo-500" />
              My Connections
            </CardTitle>
            <CardDescription>People you are connected with</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : myConnections.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="p-4 rounded-lg border border-border hover:border-primary/20 transition-colors"
                    data-testid={`card-connection-${connection.profile.userId}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar 
                        className="w-10 h-10 cursor-pointer"
                        onClick={() => setSelectedProfile(connection.profile)}
                        data-testid={`avatar-connection-${connection.profile.userId}`}
                      >
                        <AvatarImage src={connection.profile.avatarUrl || undefined} />
                        <AvatarFallback>{getInitials(connection.profile.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span 
                          className="font-medium cursor-pointer hover:text-primary block truncate"
                          onClick={() => setSelectedProfile(connection.profile)}
                          data-testid={`text-connection-name-${connection.profile.userId}`}
                        >
                          {connection.profile.fullName || 'Unknown'}
                        </span>
                        {connection.profile.yassuRole && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {connection.profile.yassuRole === 'ambassador' ? (
                              <><GraduationCap className="w-3 h-3 mr-1" /> Ambassador</>
                            ) : (
                              <><Briefcase className="w-3 h-3 mr-1" /> Advisor</>
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3"
                      onClick={() => navigate('/portal/messages')}
                      data-testid={`button-message-${connection.profile.userId}`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Link2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No connections yet. Connect with advisors and ambassadors to grow your network.
                </p>
                <div className="flex justify-center gap-3 mt-4">
                  <Button variant="outline" onClick={() => navigate('/portal/advisors')} data-testid="button-find-advisors">
                    Find Advisors
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/portal/ambassadors')} data-testid="button-find-ambassadors">
                    Find Ambassadors
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary" />
                  Spread the Word
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Know someone with a great startup idea? Invite them to {brand.name} and build together.
                </p>
              </div>
              <Button
                onClick={() => setShareModalOpen(true)}
                className="gap-2 shrink-0"
                data-testid="button-dashboard-invite"
              >
                <Share2 className="w-4 h-4" />
                Invite Friends
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <ShareInviteModal open={shareModalOpen} onOpenChange={setShareModalOpen} />

      {/* Enhanced Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
        setInviteDialogOpen(open);
        if (!open) {
          setSelectedProfile(null);
          setInviteMessage('');
          setInviteIdeaId(null);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>View member details</DialogDescription>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedProfile.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg">{getInitials(selectedProfile.fullName)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedProfile.fullName || 'Unknown'}</h3>
                  {selectedProfile.yassuRole && (
                    <Badge variant="secondary">
                      {selectedProfile.yassuRole === 'ambassador' ? (
                        <><GraduationCap className="w-3 h-3 mr-1" /> Ambassador</>
                      ) : (
                        <><Briefcase className="w-3 h-3 mr-1" /> Advisor</>
                      )}
                    </Badge>
                  )}
                </div>
              </div>
              
              {selectedProfile.bio && (
                <p className="text-sm text-muted-foreground">{selectedProfile.bio}</p>
              )}
              
              {selectedProfile.skills && selectedProfile.skills.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedProfile.skills.map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                {selectedProfile.linkedinUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedProfile.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>
              
              {/* Invite section with idea selection and message */}
              {myIdeas.length > 0 && (
                <div className="pt-4 border-t space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Invite to join your idea</Label>
                    <div className="mt-2 space-y-2">
                      {myIdeas.map((idea) => (
                        <Button
                          key={idea.id}
                          variant={inviteIdeaId === idea.id ? 'default' : 'outline'}
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => handleSelectIdea(idea.id)}
                          data-testid={`button-select-idea-${idea.id}`}
                        >
                          <Lightbulb className="w-4 h-4" />
                          {idea.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {inviteIdeaId && (
                    <div className="space-y-2">
                      <Label htmlFor="invite-message" className="text-sm font-medium">
                        Personalized Message
                      </Label>
                      <Textarea
                        id="invite-message"
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        placeholder="Write a personalized message..."
                        className="min-h-[150px] text-sm"
                        data-testid="textarea-invite-message"
                      />
                      <p className="text-xs text-muted-foreground">
                        This message will be included in the email invitation.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
              data-testid="button-cancel-invite"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={sendingInvite || !inviteIdeaId || !inviteMessage.trim()}
              data-testid="button-send-invite"
            >
              {sendingInvite ? (
                <>
                  <span className="animate-spin mr-2">&#9696;</span>
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Profile Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-review-request">
          <DialogHeader>
            <DialogTitle>Review Join Request</DialogTitle>
            <DialogDescription>
              Review this collaborator's profile and decide on their request to join your project.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* Requester profile */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedRequest.requester.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg">{getInitials(selectedRequest.requester.fullName)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedRequest.requester.fullName || 'Unknown'}</h3>
                  {selectedRequest.requester.yassuRole && (
                    <Badge variant="secondary">
                      {selectedRequest.requester.yassuRole === 'ambassador' ? (
                        <><GraduationCap className="w-3 h-3 mr-1" /> Ambassador</>
                      ) : (
                        <><Briefcase className="w-3 h-3 mr-1" /> Advisor</>
                      )}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Project requesting to join */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Requesting to join:</p>
                <p className="font-medium">{selectedRequest.idea.title}</p>
              </div>
              
              {/* Their message */}
              {selectedRequest.message && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Their message:</p>
                  <p className="text-sm italic">"{selectedRequest.message}"</p>
                </div>
              )}
              
              {/* Bio */}
              {selectedRequest.requester.bio && (
                <div>
                  <h4 className="font-medium text-sm mb-1">About</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.requester.bio}</p>
                </div>
              )}
              
              {/* Skills */}
              {selectedRequest.requester.skills && selectedRequest.requester.skills.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedRequest.requester.skills.map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Social links */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedRequest.requester.linkedinUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedRequest.requester.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => openActionDialog('pending')}
              data-testid="button-action-pending"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Need More Time
            </Button>
            <Button
              variant="outline"
              onClick={() => openActionDialog('rejected')}
              className="text-destructive border-destructive hover:bg-destructive/10"
              data-testid="button-action-reject"
            >
              <X className="w-4 h-4 mr-2" />
              Decline
            </Button>
            <Button
              onClick={() => openActionDialog('accepted')}
              data-testid="button-action-accept"
            >
              <Check className="w-4 h-4 mr-2" />
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Message Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-action-message">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'accepted' && 'Accept Request'}
              {actionType === 'rejected' && 'Decline Request'}
              {actionType === 'pending' && 'Send a Message'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accepted' && 'Write a welcome message for your new team member.'}
              {actionType === 'rejected' && 'Optionally explain your decision to the applicant.'}
              {actionType === 'pending' && 'Let them know you need more time to review their application.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="action-message">Your Message</Label>
              <Textarea
                id="action-message"
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder="Write a personalized message..."
                className="min-h-[150px] text-sm"
                data-testid="textarea-action-message"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false);
                setActionMessage('');
              }}
              data-testid="button-cancel-action"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRequest && actionType) {
                  handleJoinRequestAction(selectedRequest.id, actionType, actionMessage);
                }
              }}
              disabled={processingAction}
              variant={actionType === 'rejected' ? 'destructive' : 'default'}
              data-testid="button-confirm-action"
            >
              {processingAction ? (
                <>
                  <span className="animate-spin mr-2">&#9696;</span>
                  Sending...
                </>
              ) : (
                <>
                  {actionType === 'accepted' && <><Check className="w-4 h-4 mr-2" />Accept & Send</>}
                  {actionType === 'rejected' && <><X className="w-4 h-4 mr-2" />Decline & Send</>}
                  {actionType === 'pending' && <><MessageSquare className="w-4 h-4 mr-2" />Send Message</>}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
