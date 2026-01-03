import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { Users, Search, X, Filter, Briefcase, Heart, Check } from 'lucide-react';
import { ConnectionButton } from '@/components/ConnectionButton';
import { useAuth } from '@/contexts/AuthContext';
import { SKILL_OPTIONS, INTEREST_OPTIONS } from '@/lib/profileOptions';
import { api } from '@/lib/api';

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

const POPULAR_SKILLS = [
  'JavaScript', 'Python', 'React', 'Product Management', 'UI/UX Design',
  'Data Analysis', 'Machine Learning', 'Marketing', 'Sales', 'Finance'
];

const POPULAR_INTERESTS = [
  'SaaS', 'Fintech', 'Healthtech', 'Edtech', 'AI/ML Applications',
  'Early-stage Startups', 'E-commerce', 'Consumer Apps', 'Climate Tech', 'Enterprise Software'
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
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filters = {
    search: searchTerm || undefined,
    roles: selectedRoles.length > 0 ? selectedRoles : undefined,
    skills: selectedSkills.length > 0 ? selectedSkills : undefined,
    interests: selectedInterests.length > 0 ? selectedInterests : undefined,
    clubType: selectedClub && selectedClub !== 'all' ? selectedClub : undefined,
  };

  const { data: collaborators = [], isLoading } = useQuery<Collaborator[]>({
    queryKey: ['/api/collaborators', filters],
    queryFn: () => api.collaborators.list(filters),
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
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(prev => prev.filter(s => s !== skill));
    } else if (selectedSkills.length < 5) {
      setSelectedSkills(prev => [...prev, skill]);
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else if (selectedInterests.length < 5) {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRoles([]);
    setSelectedSkills([]);
    setSelectedInterests([]);
    setSelectedClub('all');
  };

  const hasActiveFilters = searchTerm || selectedRoles.length > 0 || selectedSkills.length > 0 || selectedInterests.length > 0 || (selectedClub && selectedClub !== 'all');
  const activeFilterCount = selectedRoles.length + selectedSkills.length + selectedInterests.length + (selectedClub && selectedClub !== 'all' ? 1 : 0);

  const isSkillMatch = (collabSkills: string[] | null, skill: string) => 
    collabSkills?.includes(skill) ?? false;
  
  const isInterestMatch = (collabInterests: string[] | null, interest: string) => 
    collabInterests?.includes(interest) ?? false;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Find Collaborators</h1>
        <p className="text-muted-foreground">
          Select skills or interests to find the right people for your team
        </p>
      </motion.div>

      <div className="space-y-3">
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
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                data-testid="button-toggle-filters"
              >
                <Filter className="w-4 h-4 mr-2" />
                More Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Collaborators</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Roles</h3>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map(role => (
                      <Badge
                        key={role.value}
                        variant={selectedRoles.includes(role.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleRole(role.value)}
                        data-testid={`filter-role-${role.value}`}
                      >
                        {selectedRoles.includes(role.value) && <Check className="w-3 h-3 mr-1" />}
                        {role.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3">Club Affiliation</h3>
                  <Select value={selectedClub} onValueChange={setSelectedClub}>
                    <SelectTrigger className="w-full" data-testid="select-club">
                      <SelectValue placeholder="Select club type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All clubs</SelectItem>
                      {CLUB_OPTIONS.map(club => (
                        <SelectItem key={club} value={club}>{club}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3">All Skills (select up to 5)</h3>
                  <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
                    {SKILL_OPTIONS.map(skill => (
                      <Badge
                        key={skill}
                        variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleSkill(skill)}
                        data-testid={`filter-skill-${skill.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        {selectedSkills.includes(skill) && <Check className="w-2.5 h-2.5 mr-0.5" />}
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3">All Interests (select up to 5)</h3>
                  <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
                    {INTEREST_OPTIONS.map(interest => (
                      <Badge
                        key={interest}
                        variant={selectedInterests.includes(interest) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleInterest(interest)}
                        data-testid={`filter-interest-${interest.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        {selectedInterests.includes(interest) && <Check className="w-2.5 h-2.5 mr-0.5" />}
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="w-full" data-testid="button-clear-filters">
                    <X className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="w-4 h-4" />
            <span className="font-medium">Skills:</span>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              {POPULAR_SKILLS.map(skill => (
                <Badge
                  key={skill}
                  variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                  className="cursor-pointer shrink-0"
                  onClick={() => toggleSkill(skill)}
                  data-testid={`quick-skill-${skill.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  {selectedSkills.includes(skill) && <Check className="w-3 h-3 mr-1" />}
                  {skill}
                </Badge>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                className="shrink-0 text-xs"
                onClick={() => setShowFilters(true)}
                data-testid="button-see-all-skills"
              >
                See all skills...
              </Button>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="w-4 h-4" />
            <span className="font-medium">Interests:</span>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              {POPULAR_INTERESTS.map(interest => (
                <Badge
                  key={interest}
                  variant={selectedInterests.includes(interest) ? 'default' : 'outline'}
                  className="cursor-pointer shrink-0"
                  onClick={() => toggleInterest(interest)}
                  data-testid={`quick-interest-${interest.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  {selectedInterests.includes(interest) && <Check className="w-3 h-3 mr-1" />}
                  {interest}
                </Badge>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                className="shrink-0 text-xs"
                onClick={() => setShowFilters(true)}
                data-testid="button-see-all-interests"
              >
                See all interests...
              </Button>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {(selectedSkills.length > 0 || selectedInterests.length > 0 || selectedRoles.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {selectedRoles.map(role => (
              <Badge key={role} variant="default" className="gap-1 cursor-pointer" onClick={() => toggleRole(role)}>
                {ROLE_OPTIONS.find(r => r.value === role)?.label}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            {selectedSkills.map(skill => (
              <Badge key={skill} variant="default" className="gap-1 cursor-pointer" onClick={() => toggleSkill(skill)}>
                {skill}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            {selectedInterests.map(interest => (
              <Badge key={interest} variant="default" className="gap-1 cursor-pointer" onClick={() => toggleInterest(interest)}>
                {interest}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs" data-testid="button-clear-active-filters">
              Clear all
            </Button>
          </div>
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
          {collaborators.map((collab, index) => {
            const matchedSkills = selectedSkills.filter(s => isSkillMatch(collab.skills, s));
            const matchedInterests = selectedInterests.filter(i => isInterestMatch(collab.interests, i));
            const hasMatches = matchedSkills.length > 0 || matchedInterests.length > 0;
            
            return (
              <motion.div
                key={collab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.02 * Math.min(index, 10) }}
              >
                <Card className="h-full hover-elevate cursor-pointer" data-testid={`card-collaborator-${collab.id}`}>
                  <Link to={`/portal/users/${collab.userId}`} className="block">
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
                      
                      {hasMatches && (
                        <div className="space-y-1">
                          {matchedSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs text-muted-foreground mr-1">Skills match:</span>
                              {matchedSkills.map((skill, i) => (
                                <Badge key={i} variant="default" className="text-xs">
                                  <Check className="w-2.5 h-2.5 mr-0.5" />
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {matchedInterests.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs text-muted-foreground mr-1">Interests match:</span>
                              {matchedInterests.map((interest, i) => (
                                <Badge key={i} variant="default" className="text-xs">
                                  <Check className="w-2.5 h-2.5 mr-0.5" />
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!hasMatches && collab.skills && collab.skills.length > 0 && (
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
                    </CardContent>
                  </Link>
                  {user?.id !== collab.userId && (
                    <CardContent className="pt-0">
                      <ConnectionButton
                        targetUserId={collab.userId}
                        currentUserId={user?.id}
                        className="w-full"
                      />
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
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
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters 
              ? `No one matches ${selectedSkills.length > 0 ? 'these skills' : ''}${selectedSkills.length > 0 && selectedInterests.length > 0 ? ' and ' : ''}${selectedInterests.length > 0 ? 'these interests' : ''} yet` 
              : 'Check back later for new members'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear filters and show all
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
