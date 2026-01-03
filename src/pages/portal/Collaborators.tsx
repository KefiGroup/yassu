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
import { motion } from 'framer-motion';
import { Users, Search, X, SlidersHorizontal, Check } from 'lucide-react';
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

  const hasActiveFilters = selectedSkills.length > 0 || selectedInterests.length > 0 || selectedRoles.length > 0 || (selectedClub && selectedClub !== 'all');
  const activeFilterCount = selectedRoles.length + selectedSkills.length + selectedInterests.length + (selectedClub && selectedClub !== 'all' ? 1 : 0);

  const isSkillMatch = (collabSkills: string[] | null, skill: string) => 
    collabSkills?.includes(skill) ?? false;
  
  const isInterestMatch = (collabInterests: string[] | null, interest: string) => 
    collabInterests?.includes(interest) ?? false;

  const FilterChip = ({ 
    label, 
    selected, 
    onClick 
  }: { 
    label: string; 
    selected: boolean; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        transition-all duration-200 ease-out
        ${selected 
          ? 'bg-primary text-primary-foreground shadow-sm' 
          : 'bg-secondary/50 text-foreground hover:bg-secondary'
        }
      `}
      data-testid={`chip-${label.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {selected && <Check className="w-3.5 h-3.5" />}
      {label}
    </button>
  );

  const ActiveFilterPill = ({ 
    label, 
    onRemove 
  }: { 
    label: string; 
    onRemove: () => void;
  }) => (
    <span className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-sm bg-primary text-primary-foreground">
      {label}
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-primary-foreground/20 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-semibold text-foreground">Find Collaborators</h1>
        <p className="text-muted-foreground mt-1">
          Select skills or interests to find the right people for your team
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-5"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name or university..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base bg-background"
            data-testid="input-search-collaborators"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Skills</h3>
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-more-filters">
                    <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                    More options
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>All Filters</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-8 mt-8">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Roles</h3>
                      <div className="flex flex-wrap gap-2">
                        {ROLE_OPTIONS.map(role => (
                          <FilterChip
                            key={role.value}
                            label={role.label}
                            selected={selectedRoles.includes(role.value)}
                            onClick={() => toggleRole(role.value)}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Club Affiliation</h3>
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
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">All Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {SKILL_OPTIONS.map(skill => (
                          <FilterChip
                            key={skill}
                            label={skill}
                            selected={selectedSkills.includes(skill)}
                            onClick={() => toggleSkill(skill)}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">All Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {INTEREST_OPTIONS.map(interest => (
                          <FilterChip
                            key={interest}
                            label={interest}
                            selected={selectedInterests.includes(interest)}
                            onClick={() => toggleInterest(interest)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t">
                      <Button onClick={() => setShowFilters(false)} className="w-full" data-testid="button-show-results">
                        Show Results
                      </Button>
                      {hasActiveFilters && (
                        <Button variant="outline" onClick={clearFilters} className="w-full" data-testid="button-clear-filters">
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SKILLS.map(skill => (
                <FilterChip
                  key={skill}
                  label={skill}
                  selected={selectedSkills.includes(skill)}
                  onClick={() => toggleSkill(skill)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_INTERESTS.map(interest => (
                <FilterChip
                  key={interest}
                  label={interest}
                  selected={selectedInterests.includes(interest)}
                  onClick={() => toggleInterest(interest)}
                />
              ))}
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
            <span className="text-sm text-muted-foreground font-medium">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied:
            </span>
            {selectedRoles.map(role => (
              <ActiveFilterPill
                key={role}
                label={ROLE_OPTIONS.find(r => r.value === role)?.label || role}
                onRemove={() => toggleRole(role)}
              />
            ))}
            {selectedSkills.map(skill => (
              <ActiveFilterPill key={skill} label={skill} onRemove={() => toggleSkill(skill)} />
            ))}
            {selectedInterests.map(interest => (
              <ActiveFilterPill key={interest} label={interest} onRemove={() => toggleInterest(interest)} />
            ))}
            {selectedClub && selectedClub !== 'all' && (
              <ActiveFilterPill label={selectedClub} onRemove={() => setSelectedClub('all')} />
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters} 
              className="text-muted-foreground ml-auto"
              data-testid="button-clear-active-filters"
            >
              Clear all
            </Button>
          </div>
        )}
      </motion.div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Searching...' : `${collaborators.length} collaborator${collaborators.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collaborators.map((collab, index) => {
            const matchedSkills = selectedSkills.filter(s => isSkillMatch(collab.skills, s));
            const matchedInterests = selectedInterests.filter(i => isInterestMatch(collab.interests, i));
            const hasMatches = matchedSkills.length > 0 || matchedInterests.length > 0;
            
            return (
              <motion.div
                key={collab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.03 * Math.min(index, 8) }}
              >
                <Card className="h-full hover-elevate cursor-pointer" data-testid={`card-collaborator-${collab.id}`}>
                  <Link to={`/portal/users/${collab.userId}`} className="block">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-11 h-11 shrink-0">
                          <AvatarImage src={collab.avatarUrl || undefined} alt={collab.fullName || 'User'} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {getInitials(collab.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold line-clamp-1">{collab.fullName || 'Anonymous'}</CardTitle>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {collab.roles.map(role => (
                              <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs capitalize">
                                {role}
                              </Badge>
                            ))}
                            {collab.university?.shortName && (
                              <span className="text-xs text-muted-foreground">
                                {collab.university.shortName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {collab.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {collab.bio}
                        </p>
                      )}
                      
                      {hasMatches && (
                        <div className="flex flex-wrap gap-1.5">
                          {matchedSkills.map((skill, i) => (
                            <span 
                              key={i} 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                            >
                              <Check className="w-3 h-3" />
                              {skill}
                            </span>
                          ))}
                          {matchedInterests.map((interest, i) => (
                            <span 
                              key={i} 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                            >
                              <Check className="w-3 h-3" />
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {!hasMatches && collab.skills && collab.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {collab.skills.slice(0, 3).map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-secondary/70 text-secondary-foreground">
                              {skill}
                            </span>
                          ))}
                          {collab.skills.length > 3 && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-secondary/70 text-secondary-foreground">
                              +{collab.skills.length - 3}
                            </span>
                          )}
                        </div>
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
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-5">
            <Users className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No collaborators found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            {hasActiveFilters 
              ? 'No one matches your current filters yet. Try different criteria or check back later.' 
              : 'New collaborators are joining regularly. Check back soon!'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} data-testid="button-clear-empty-state">
              Clear all filters
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
