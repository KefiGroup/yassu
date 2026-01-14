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
} from 'lucide-react';

interface TeamMember {
  id: string;
  userId: number;
  role: string;
  joinedAt: string;
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
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

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
          toast({
            title: 'Team not found',
            description: 'This team may have been deleted.',
            variant: 'destructive',
          });
          navigate('/portal/teams');
        }
      } catch (error) {
        console.error('Failed to fetch team:', error);
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
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Team not found</h2>
        <Button onClick={() => navigate('/portal/teams')} data-testid="button-back-to-teams">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>
      </div>
    );
  }

  const isCreator = user?.id === team.createdBy;
  const allMembers = [
    {
      id: 'creator',
      userId: team.createdBy,
      role: 'Founder',
      joinedAt: team.createdAt,
      fullName: team.creatorName || 'Team Creator',
      avatarUrl: team.creatorAvatar || null,
      headline: null,
      isCreator: true,
    },
    ...members.map(m => ({ ...m, isCreator: false })),
  ];

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
          data-testid="button-back-teams"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
            {team.description && (
              <p className="text-muted-foreground mt-1">{team.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{allMembers.length} member{allMembers.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          
          {isCreator && (
            <Button onClick={() => navigate(`/portal/ideas/${team.ideaId}`)} data-testid="button-invite-members">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Members
            </Button>
          )}
        </div>
      </motion.div>

      {team.ideaId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card 
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate(`/portal/ideas/${team.ideaId}`)}
            data-testid="card-linked-idea"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Linked Project</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{team.ideaTitle || 'View Project'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click to view the project details and business plan
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              People working on this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allMembers.map((member, index) => (
                <div 
                  key={member.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/portal/users/${member.userId}`)}
                  data-testid={`member-${member.userId}`}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback>{getInitials(member.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{member.fullName}</p>
                      {(member as any).isCreator && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.role || 'Team Member'}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {(member as any).isCreator ? 'Founder' : 'Member'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Team Discussion
            </CardTitle>
            <CardDescription>
              Communicate with your team about the project
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Team messaging is coming soon. For now, visit the project page for comments.
            </p>
            {team.ideaId && (
              <Button 
                variant="outline" 
                onClick={() => navigate(`/portal/ideas/${team.ideaId}`)}
                data-testid="button-view-comments"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                View Project Comments
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
