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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeam() {
      if (!id) return;
      
      try {
        const response = await fetch(`/api/teams/${id}`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setTeam(data.team);
          setMembers(data.members || []);
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

        {advisors.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Advisors
                <Badge variant="secondary" className="ml-2">{advisors.length}</Badge>
              </h3>
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
          </>
        )}

        {collaborators.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" />
                Collaborators
                <Badge variant="secondary" className="ml-2">{collaborators.length}</Badge>
              </h3>
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
          </>
        )}

        {advisors.length === 0 && collaborators.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <UserPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No team members yet</h3>
              <p className="text-muted-foreground mb-4">
                {isCreator 
                  ? 'Invite collaborators and advisors to grow your team!'
                  : 'The founder hasn\'t added any team members yet.'}
              </p>
              {isCreator && (
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => navigate('/portal/collaborators')}
                    data-testid="button-find-collaborators-empty"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Find Collaborators
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/portal/advisors')}
                    data-testid="button-find-advisors-empty"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Find Advisors
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
