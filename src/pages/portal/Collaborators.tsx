import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Users, Search, X, Filter } from 'lucide-react';
import { ConnectionButton } from '@/components/ConnectionButton';
import { useAuth } from '@/contexts/AuthContext';
import { SKILL_OPTIONS, INTEREST_OPTIONS } from '@/lib/profileOptions';

const ROLE_OPTIONS = [
  { value: 'creator', label: 'Creators' },
  { value: 'ambassador', label: 'Ambassadors' },
  { value: 'advisor', label: 'Advisors' },
];

const CLUB_OPTIONS = [
  'AI / Data Science Clubs',
  'Business School Associations',
  'Computer Science Clubs',
  'Consulting Clubs',
  'Design / UX Clubs',
  'Engineering Societies',
  'Entrepreneurship Clubs',
  'Innovation / Incubator Clubs',
  'Product Management Clubs',
  'Startup / Founder Clubs',
  'Venture Capital Clubs',
  'Others',
  'None',
];

interface Collaborator {
  id: number;
  userId: number;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  skills: string[] | null;
  interests: string[] | null;
  clubType: string | null;
  roles: string[];
  university?: { name: string; shortName: string | null } | null;
}

export default function Collaborators() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    selectedRoles.forEach(r => params.append('roles', r));
    selectedSkills.forEach(s => params.append('skills', s));
    selectedInterests.forEach(i => params.append('interests', i));
    if (selectedClub) params.append('clubType', selectedClub);
    return params.toString();
  }, [searchTerm, selectedRoles, selectedSkills, selectedInterests, selectedClub]);

  const { data: collaborators = [], isLoading } = useQuery<Collaborator[]>({
    queryKey: ['/api/collaborators', queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/collaborators?${queryParams}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch collaborators');
      return res.json();
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'creator': return 'default';
      case 'ambassador': return 'secondary';
      case 'advisor': return 'outline';
      default: return 'secondary';
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRoles([]);
    setSelectedSkills([]);
    setSelectedInterests([]);
    setSelectedClub('');
  };

  const hasActiveFilters = searchTerm || selectedRoles.length > 0 || selectedSkills.length > 0 || selectedInterests.length > 0 || selectedClub;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Collaborators</h1>
        <p className="text-muted-foreground">
          Discover and connect with fellow students, creators, advisors, and ambassadors
        </p>
      </motion.div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or university..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-collaborators"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {(selectedRoles.length + selectedSkills.length + selectedInterests.length + (selectedClub ? 1 : 0))}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 p-4 bg-muted/50 rounded-lg"
          >
            <div>
              <h3 className="text-sm font-medium mb-2">Roles</h3>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map(role => (
                  <Badge
                    key={role.value}
                    variant={selectedRoles.includes(role.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleRole(role.value)}
                    data-testid={`filter-role-${role.value}`}
                  >
                    {role.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Club Affiliation</h3>
              <Select value={selectedClub} onValueChange={setSelectedClub}>
                <SelectTrigger className="w-full max-w-xs" data-testid="select-club">
                  <SelectValue placeholder="Select club type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All clubs</SelectItem>
                  {CLUB_OPTIONS.map(club => (
                    <SelectItem key={club} value={club}>{club}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Skills (select up to 5)</h3>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {SKILL_OPTIONS.slice(0, 30).map(skill => (
                  <Badge
                    key={skill}
                    variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => selectedSkills.length < 5 || selectedSkills.includes(skill) ? toggleSkill(skill) : null}
                    data-testid={`filter-skill-${skill.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Interests (select up to 5)</h3>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {INTEREST_OPTIONS.slice(0, 30).map(interest => (
                  <Badge
                    key={interest}
                    variant={selectedInterests.includes(interest) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => selectedInterests.length < 5 || selectedInterests.includes(interest) ? toggleInterest(interest) : null}
                    data-testid={`filter-interest-${interest.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {isLoading ? 'Loading...' : `${collaborators.length} collaborator${collaborators.length !== 1 ? 's' : ''} found`}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : collaborators.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collaborators.map((collab, index) => (
            <motion.div
              key={collab.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.02 * Math.min(index, 10) }}
            >
              <Card className="h-full" data-testid={`card-collaborator-${collab.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={collab.avatarUrl || undefined} alt={collab.fullName || 'User'} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(collab.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">{collab.fullName || 'Anonymous'}</CardTitle>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {collab.roles.map(role => (
                          <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs capitalize">
                            {role}
                          </Badge>
                        ))}
                        {collab.university?.shortName && (
                          <Badge variant="secondary" className="text-xs">
                            {collab.university.shortName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {collab.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {collab.bio}
                    </p>
                  )}
                  {collab.skills && collab.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {collab.skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {collab.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{collab.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  {collab.clubType && collab.clubType !== 'None' && (
                    <p className="text-xs text-muted-foreground">
                      {collab.clubType}
                    </p>
                  )}
                  {user?.id !== collab.userId && (
                    <ConnectionButton
                      targetUserId={collab.userId}
                      currentUserId={user?.id}
                      className="w-full"
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center py-16"
        >
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No collaborators found</h3>
          <p className="text-muted-foreground">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Check back later for new members'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
