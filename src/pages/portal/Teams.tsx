import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Users, Plus, Search, User, Building, MapPin, Briefcase } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  skills: string[];
  interests: string[];
  availability: string | null;
  major: string | null;
  universities: { short_name: string | null } | null;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  team_members: { user_id: string; role: string }[];
}

export default function Teams() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [people, setPeople] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      // Fetch people
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          id, full_name, avatar_url, skills, interests, availability, major,
          universities:university_id (short_name)
        `)
        .neq('id', user?.id || '')
        .limit(20);

      if (profiles) setPeople(profiles as Profile[]);

      // Fetch all teams
      const { data: allTeams } = await supabase
        .from('teams')
        .select(`
          id, name, description, created_at,
          team_members (user_id, role)
        `)
        .order('created_at', { ascending: false });

      if (allTeams) setTeams(allTeams as Team[]);

      // Fetch my teams
      if (user) {
        const { data: memberOf } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id);

        if (memberOf && allTeams) {
          const myTeamIds = memberOf.map((m) => m.team_id);
          setMyTeams(allTeams.filter((t) => myTeamIds.includes(t.id)) as Team[]);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [user]);

  const filteredPeople = people.filter(
    (person) =>
      person.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      {/* Header */}
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
        <Button onClick={() => navigate('/portal/teams/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </motion.div>

      <Tabs defaultValue="people" className="w-full">
        <TabsList>
          <TabsTrigger value="people">Find People</TabsTrigger>
          <TabsTrigger value="teams">Browse Teams</TabsTrigger>
          <TabsTrigger value="my-teams">My Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-6 space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, skills, or interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
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
                  <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={person.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(person.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{person.full_name || 'Anonymous'}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {person.major && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {person.major}
                              </span>
                            )}
                            {person.universities?.short_name && (
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {person.universities.short_name}
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

                      {person.availability && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {person.availability}
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
                        <span>{team.team_members?.length || 0} members</span>
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
              <Button onClick={() => navigate('/portal/teams/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-teams" className="mt-6">
          {myTeams.length > 0 ? (
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
                        <span>{team.team_members?.length || 0} members</span>
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
                Create a team or join one to get started!
              </p>
              <Button onClick={() => navigate('/portal/teams/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
