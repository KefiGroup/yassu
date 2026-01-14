import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Users, Plus, Search, User, Building, Briefcase, Mail, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: number;
  userId: number;
  fullName: string | null;
  avatarUrl: string | null;
  skills: string[];
  interests: string[];
  availability: string | null;
  major: string | null;
  universityName?: string | null;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
}

interface TeamInvite {
  id: string;
  ideaId: string;
  inviterId: number;
  message: string | null;
  status: string;
  createdAt: string;
  ideaTitle: string | null;
  inviterName: string | null;
  inviterAvatar: string | null;
}

export default function Teams() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [people, setPeople] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingToInvite, setRespondingToInvite] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMyTeamsAndInvites = async () => {
    if (!user) return;
    
    try {
      const [myTeamsResponse, invitesResponse] = await Promise.all([
        fetch('/api/teams/my', { credentials: 'include' }),
        fetch('/api/team-invites/received', { credentials: 'include' })
      ]);
      
      if (myTeamsResponse.ok) {
        const myTeamsData = await myTeamsResponse.json();
        setMyTeams(myTeamsData);
      }
      
      if (invitesResponse.ok) {
        const invitesData = await invitesResponse.json();
        setReceivedInvites(invitesData.filter((i: TeamInvite) => i.status === 'pending'));
      }
    } catch (error) {
      console.error('Failed to fetch my teams/invites:', error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/collaborators', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const filteredData = data.filter((p: Profile) => p.userId !== user?.id);
          setPeople(filteredData);
        }

        const teamsResponse = await fetch('/api/teams', { credentials: 'include' });
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          setTeams(teamsData);
        }
        
        await fetchMyTeamsAndInvites();
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const handleInviteResponse = async (inviteId: string, status: 'accepted' | 'declined') => {
    setRespondingToInvite(inviteId);
    try {
      const response = await fetch(`/api/team-invites/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        toast({
          title: status === 'accepted' ? 'Invitation accepted!' : 'Invitation declined',
          description: status === 'accepted' 
            ? 'You have joined the team. Welcome aboard!' 
            : 'The invitation has been declined.',
        });
        
        // Refresh data
        await fetchMyTeamsAndInvites();
      } else {
        throw new Error('Failed to respond to invite');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to respond to invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRespondingToInvite(null);
    }
  };

  const filteredPeople = people.filter(
    (person) =>
      person.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.skills?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      person.interests?.some((i) => i.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams & Talent</h1>
          <p className="text-muted-foreground">
            Find teammates and discover talent in the community
          </p>
        </div>
        <Button onClick={() => navigate('/portal/teams/new')} data-testid="button-create-team">
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </motion.div>

      <Tabs defaultValue="people" className="w-full">
        <TabsList>
          <TabsTrigger value="people" data-testid="tab-find-people">Find People</TabsTrigger>
          <TabsTrigger value="teams" data-testid="tab-browse-teams">Browse Teams</TabsTrigger>
          <TabsTrigger value="my-teams" data-testid="tab-my-teams">My Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, skills, or interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-people"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPeople.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPeople.map((person, index) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 * index }}
                >
                  <Card 
                    className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                    onClick={() => navigate(`/portal/users/${person.userId}`)}
                    data-testid={`card-person-${person.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={person.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(person.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{person.fullName || 'Anonymous'}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {person.major && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {person.major}
                              </span>
                            )}
                            {person.universityName && (
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {person.universityName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {person.skills && person.skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {person.skills.slice(0, 4).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {person.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{person.skills.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No people found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          {teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team, index) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 * index }}
                >
                  <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {team.description || 'No description'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{team.memberCount || 0} members</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to create a team!
              </p>
              <Button onClick={() => navigate('/portal/teams/new')} data-testid="button-create-team-empty">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-teams" className="mt-6 space-y-8">
          {receivedInvites.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Pending Invitations ({receivedInvites.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receivedInvites.map((invite, index) => (
                  <motion.div
                    key={invite.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 * index }}
                  >
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={invite.inviterAvatar || undefined} />
                            <AvatarFallback>{getInitials(invite.inviterName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base">{invite.ideaTitle || 'Unknown Project'}</CardTitle>
                            <CardDescription className="text-sm">
                              Invited by {invite.inviterName || 'Unknown'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {invite.message && (
                          <p className="text-sm text-muted-foreground mb-4 italic">
                            "{invite.message}"
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleInviteResponse(invite.id, 'accepted')}
                            disabled={respondingToInvite === invite.id}
                            data-testid={`button-accept-invite-${invite.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleInviteResponse(invite.id, 'declined')}
                            disabled={respondingToInvite === invite.id}
                            data-testid={`button-decline-invite-${invite.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/portal/ideas/${invite.ideaId}`)}
                            data-testid={`button-view-idea-${invite.id}`}
                          >
                            View Project
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
          {myTeams.length > 0 ? (
            <div>
              {receivedInvites.length > 0 && (
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  My Teams
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTeams.map((team, index) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 * index }}
                  >
                    <Card
                      className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                      onClick={() => navigate(`/portal/teams/${team.id}`)}
                      data-testid={`card-my-team-${team.id}`}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {team.description || 'No description'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{team.memberCount || 0} members</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : receivedInvites.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-6">
                Create a team or join one to get started!
              </p>
              <Button onClick={() => navigate('/portal/teams/new')} data-testid="button-create-team-my-empty">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
