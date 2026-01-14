import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  Lightbulb,
  MessageSquare,
  UserPlus,
  Crown,
  Loader2,
  Star,
  Briefcase,
  ExternalLink,
  Check,
  X,
  Clock,
} from 'lucide-react';

interface TeamMember {
  id: string;
  userId: number;
  role: string;
  joinedAt: string;
  fullName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  skills?: string[] | null;
  interests?: string[] | null;
}

interface RecommendedPerson {
  userId: number;
  fullName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  skills?: string[] | null;
}

interface JoinRequest {
  id: string;
  userId: number;
  message: string | null;
  role: string | null;
  motivation: string | null;
  experience: string | null;
  status: string | null;
  createdAt: string;
  fullName: string | null;
  avatarUrl: string | null;
  headline: string | null;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  ideaId: string | null;
  createdBy: number;
  createdAt: string;
  ideaTitle?: string;
  creatorName?: string;
  creatorAvatar?: string;
  creatorHeadline?: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role.toLowerCase()) {
    case 'advisor':
      return 'default';
    case 'collaborator':
    case 'member':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getRoleIcon(role: string) {
  switch (role.toLowerCase()) {
    case 'advisor':
      return <Star className="w-3 h-3" />;
    case 'collaborator':
    case 'member':
      return <Briefcase className="w-3 h-3" />;
    default:
      return null;
  }
}

interface MemberCardProps {
  member: {
    userId: number;
    fullName: string | null;
    avatarUrl: string | null;
    headline: string | null;
    role: string;
    joinedAt: string;
    isCreator?: boolean;
  };
  navigate: (path: string) => void;
}

function MemberCard({ member, navigate }: MemberCardProps) {
  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar 
            className="w-14 h-14 cursor-pointer border-2 border-background shadow-sm"
            onClick={() => navigate(`/portal/users/${member.userId}`)}
          >
            <AvatarImage src={member.avatarUrl || undefined} />
            <AvatarFallback className="text-lg">{getInitials(member.fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 
                className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                onClick={() => navigate(`/portal/users/${member.userId}`)}
              >
                {member.fullName || 'Team Member'}
              </h4>
              {member.isCreator && (
                <Badge variant="default" className="shrink-0 gap-1">
                  <Crown className="w-3 h-3" />
                  Founder
                </Badge>
              )}
              {!member.isCreator && (
                <Badge variant={getRoleBadgeVariant(member.role)} className="shrink-0 gap-1">
                  {getRoleIcon(member.role)}
                  {member.role}
                </Badge>
              )}
            </div>
            {member.headline && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {member.headline}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined {formatDate(member.joinedAt)}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/portal/users/${member.userId}`)}
            data-testid={`button-view-member-${member.userId}`}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [recommendedAdvisors, setRecommendedAdvisors] = useState<RecommendedPerson[]>([]);
  const [recommendedCollaborators, setRecommendedCollaborators] = useState<RecommendedPerson[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeam() {
      if (!id) return;
      
      try {
        const response = await fetch(`/api/teams/${id}`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setTeam(data.team);
          setMembers(data.members || []);
          setRecommendedAdvisors(data.recommendedAdvisors || []);
          setRecommendedCollaborators(data.recommendedCollaborators || []);
          setJoinRequests(data.joinRequests || []);
        } else if (response.status === 404) {
          setError('Team not found');
          toast({
            title: 'Team not found',
            description: 'This team may have been deleted.',
            variant: 'destructive',
          });
        } else if (response.status === 403) {
          setError('Access denied');
          toast({
            title: 'Access denied',
            description: 'You do not have permission to view this team.',
            variant: 'destructive',
          });
        } else {
          setError('Failed to load team');
        }
      } catch (err) {
        console.error('Failed to fetch team:', err);
        setError('Failed to load team');
        toast({
          title: 'Error',
          description: 'Failed to load team details.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTeam();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="text-center py-16">
        <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{error || 'Team not found'}</h2>
        <p className="text-muted-foreground mb-4">
          {error === 'Access denied' 
            ? 'You need to be a team member to view this page.'
            : 'The team you are looking for does not exist.'}
        </p>
        <Button onClick={() => navigate('/portal/teams')} data-testid="button-back-to-teams">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>
      </div>
    );
  }

  const isCreator = user?.id === team.createdBy;
  
  const founder = {
    userId: team.createdBy,
    fullName: team.creatorName || 'Team Creator',
    avatarUrl: team.creatorAvatar || null,
    headline: team.creatorHeadline || null,
    role: 'Founder',
    joinedAt: team.createdAt,
    isCreator: true,
  };
  
  const advisors = members.filter(m => m.role.toLowerCase() === 'advisor');
  const collaborators = members.filter(m => 
    m.role.toLowerCase() === 'collaborator' || 
    m.role.toLowerCase() === 'member' ||
    (!['advisor', 'founder'].includes(m.role.toLowerCase()))
  );

  const handleJoinRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setProcessingRequest(requestId);
    try {
      const response = await fetch(`/api/join-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: action }),
      });
      
      if (response.ok) {
        toast({
          title: action === 'approved' ? 'Request Approved' : 'Request Rejected',
          description: action === 'approved' 
            ? 'The member has been added to your team.' 
            : 'The join request has been declined.',
        });
        // Refresh team data
        const teamResponse = await fetch(`/api/teams/${id}`, { credentials: 'include' });
        if (teamResponse.ok) {
          const data = await teamResponse.json();
          setMembers(data.members || []);
          setJoinRequests(data.joinRequests || []);
        }
      } else {
        throw new Error('Failed to process request');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to process the join request.',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Button 
          variant="ghost" 
          onClick={() => navigate('/portal/teams')} 
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>
        
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl mb-2">{team.name}</CardTitle>
                <CardDescription className="text-base">
                  {team.description || 'No description provided'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {team.ideaId && (
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/portal/ideas/${team.ideaId}`)}
                    data-testid="button-view-project"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    View Project
                  </Button>
                )}
                {isCreator && (
                  <>
                    <Button
                      variant="default"
                      onClick={() => navigate('/portal/collaborators')}
                      data-testid="button-find-collaborators"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Find Collaborators
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/portal/advisors')}
                      data-testid="button-find-advisors"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Find Advisors
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{members.length + 1} team members</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Created {formatDate(team.createdAt)}</span>
              </div>
              {team.ideaTitle && (
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>{team.ideaTitle}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-6"
      >
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Founder
          </h3>
          <MemberCard member={founder} navigate={navigate} />
        </div>

        <Separator />
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Advisors
              </CardTitle>
              {isCreator && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/portal/advisors')}
                  data-testid="button-browse-advisors"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Browse All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {advisors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Confirmed Advisors ({advisors.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {advisors.map((member) => (
                    <MemberCard 
                      key={member.id} 
                      member={{ ...member, isCreator: false }} 
                      navigate={navigate} 
                    />
                  ))}
                </div>
              </div>
            )}
            
            {isCreator && recommendedAdvisors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Recommended Advisors to Invite</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedAdvisors.map((person) => (
                    <Card key={person.userId} className="hover:shadow-md transition-all border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar 
                            className="w-12 h-12 cursor-pointer"
                            onClick={() => navigate(`/portal/users/${person.userId}`)}
                          >
                            <AvatarImage src={person.avatarUrl || undefined} />
                            <AvatarFallback>{getInitials(person.fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 
                              className="font-semibold cursor-pointer hover:text-primary truncate"
                              onClick={() => navigate(`/portal/users/${person.userId}`)}
                            >
                              {person.fullName || 'User'}
                            </h4>
                            <Badge variant="outline" className="mt-1">
                              <Star className="w-3 h-3 mr-1" />
                              Advisor Badge
                            </Badge>
                            {person.headline && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{person.headline}</p>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => navigate(`/portal/users/${person.userId}`)}
                            data-testid={`button-invite-advisor-${person.userId}`}
                          >
                            View Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {advisors.length === 0 && recommendedAdvisors.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No advisors yet. Browse the marketplace to find experts for your team.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" />
                Collaborators
              </CardTitle>
              {isCreator && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/portal/collaborators')}
                  data-testid="button-browse-collaborators"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Browse All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {collaborators.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Confirmed Collaborators ({collaborators.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {collaborators.map((member) => (
                    <MemberCard 
                      key={member.id} 
                      member={{ ...member, isCreator: false }} 
                      navigate={navigate} 
                    />
                  ))}
                </div>
              </div>
            )}
            
            {isCreator && recommendedCollaborators.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Recommended Collaborators to Invite</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedCollaborators.map((person) => (
                    <Card key={person.userId} className="hover:shadow-md transition-all border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar 
                            className="w-12 h-12 cursor-pointer"
                            onClick={() => navigate(`/portal/users/${person.userId}`)}
                          >
                            <AvatarImage src={person.avatarUrl || undefined} />
                            <AvatarFallback>{getInitials(person.fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 
                              className="font-semibold cursor-pointer hover:text-primary truncate"
                              onClick={() => navigate(`/portal/users/${person.userId}`)}
                            >
                              {person.fullName || 'User'}
                            </h4>
                            {person.headline && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{person.headline}</p>
                            )}
                            {person.skills && person.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {person.skills.slice(0, 2).map((skill, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">{skill}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => navigate(`/portal/users/${person.userId}`)}
                            data-testid={`button-invite-collaborator-${person.userId}`}
                          >
                            View Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {collaborators.length === 0 && recommendedCollaborators.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No collaborators yet. Browse the marketplace to find team members.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isCreator && (
          <>
            <Separator />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Team Join Requests
                  {joinRequests.length > 0 && (
                    <Badge variant="default" className="ml-2">{joinRequests.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {joinRequests.length > 0 ? (
                  <div className="space-y-4">
                    {joinRequests.map((request) => (
                      <Card key={request.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Avatar 
                              className="w-12 h-12 cursor-pointer"
                              onClick={() => navigate(`/portal/users/${request.userId}`)}
                            >
                              <AvatarImage src={request.avatarUrl || undefined} />
                              <AvatarFallback>{getInitials(request.fullName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 
                                  className="font-semibold cursor-pointer hover:text-primary"
                                  onClick={() => navigate(`/portal/users/${request.userId}`)}
                                >
                                  {request.fullName || 'User'}
                                </h4>
                                {request.role && (
                                  <Badge variant="outline">{request.role}</Badge>
                                )}
                              </div>
                              {request.headline && (
                                <p className="text-sm text-muted-foreground mb-2">{request.headline}</p>
                              )}
                              {request.motivation && (
                                <div className="bg-background rounded p-2 mb-2">
                                  <p className="text-sm font-medium">Why they want to join:</p>
                                  <p className="text-sm text-muted-foreground">{request.motivation}</p>
                                </div>
                              )}
                              {request.experience && (
                                <div className="text-sm">
                                  <span className="font-medium">Experience: </span>
                                  <span className="text-muted-foreground">{request.experience}</span>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Requested {formatDate(request.createdAt)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleJoinRequestAction(request.id, 'approved')}
                                disabled={processingRequest === request.id}
                                data-testid={`button-approve-${request.id}`}
                              >
                                {processingRequest === request.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleJoinRequestAction(request.id, 'rejected')}
                                disabled={processingRequest === request.id}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No pending join requests</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>
    </div>
  );
}
