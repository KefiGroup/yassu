import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
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
} from 'lucide-react';
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
  stage: 'concept' | 'validating' | 'building' | 'launched' | null;
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

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [potentialMembers, setPotentialMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);
  const [invitingUserId, setInvitingUserId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ideas, requests, members] = await Promise.all([
          fetch('/api/ideas/mine', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
          fetch('/api/join-requests', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
          fetch('/api/profiles/potential-team', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
        ]);
        
        setMyIdeas(ideas);
        setJoinRequests(requests);
        setPotentialMembers(members);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleJoinRequestAction = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await fetch(`/api/join-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      toast({
        title: status === 'accepted' ? 'Request accepted' : 'Request rejected',
        description: status === 'accepted' 
          ? 'The person has been notified and added to your team.' 
          : 'The person has been notified.',
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update request', variant: 'destructive' });
    }
  };

  const handleInvite = async (inviteeId: number, ideaId: string) => {
    setInvitingUserId(inviteeId);
    try {
      await fetch('/api/team-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ideaId, inviteeId }),
      });
      
      setPotentialMembers(prev => prev.filter(m => m.userId !== inviteeId));
      setSelectedProfile(null);
      toast({
        title: 'Invite sent',
        description: 'The person has been invited to join your team.',
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send invite', variant: 'destructive' });
    } finally {
      setInvitingUserId(null);
    }
  };

  const stageColors: Record<string, string> = {
    concept: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    validating: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    building: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    launched: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-welcome">
          Welcome back, {profile?.fullName?.split(' ')[0] || 'Founder'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your ideas and build your team.
        </p>
      </motion.div>

      {/* Section 1: My Ideas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                My Ideas
              </CardTitle>
              <CardDescription>Your startup ideas and their current stage</CardDescription>
            </div>
            <Button onClick={() => navigate('/portal/ideas/new')} data-testid="button-new-idea">
              <Plus className="w-4 h-4 mr-2" />
              New Idea
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
                      <Badge className={stageColors[idea.stage || 'concept'] || 'bg-muted'}>
                        {idea.stage || 'concept'}
                      </Badge>
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
            <CardDescription>Advisors and Ambassadors requesting to join your ideas</CardDescription>
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
                          size="icon"
                          variant="outline"
                          onClick={() => handleJoinRequestAction(request.id, 'rejected')}
                          data-testid={`button-reject-${request.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          onClick={() => handleJoinRequestAction(request.id, 'accepted')}
                          data-testid={`button-accept-${request.id}`}
                        >
                          <Check className="w-4 h-4" />
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

      {/* Section 3: People to Invite */}
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
            <CardDescription>Suggested Advisors and Ambassadors you may want to invite to your team</CardDescription>
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
                        onClick={() => setSelectedProfile(member)}
                        data-testid={`avatar-member-${member.userId}`}
                      >
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback>{getInitials(member.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span 
                          className="font-medium cursor-pointer hover:text-primary block truncate"
                          onClick={() => setSelectedProfile(member)}
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
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => {
                        if (myIdeas.length === 1) {
                          handleInvite(member.userId, myIdeas[0].id);
                        } else if (myIdeas.length > 1) {
                          setSelectedProfile(member);
                          setSelectedIdea(null);
                        } else {
                          toast({
                            title: 'No ideas yet',
                            description: 'Post an idea first to invite team members.',
                            variant: 'destructive',
                          });
                        }
                      }}
                      disabled={invitingUserId === member.userId}
                      data-testid={`button-invite-${member.userId}`}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {myIdeas.length === 0 
                    ? 'Post an idea first to start inviting team members' 
                    : 'No advisors or ambassadors available to invite'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile Preview Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-md">
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
                {selectedProfile.githubUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedProfile.githubUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>
              
              {/* Invite section if there are multiple ideas */}
              {myIdeas.length > 0 && !joinRequests.some(r => r.requester.userId === selectedProfile.userId) && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">Invite to join your idea</h4>
                  <div className="space-y-2">
                    {myIdeas.map((idea) => (
                      <Button
                        key={idea.id}
                        variant={selectedIdea === idea.id ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleInvite(selectedProfile.userId, idea.id)}
                        disabled={invitingUserId === selectedProfile.userId}
                        data-testid={`button-invite-to-${idea.id}`}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {idea.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
