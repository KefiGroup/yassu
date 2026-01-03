import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Users, Search, X, Check } from 'lucide-react';
import { ConnectionButton } from '@/components/ConnectionButton';
import { useAuth } from '@/contexts/AuthContext';
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
];

const SKILL_CATEGORIES = [
  { value: 'engineering', label: 'Engineering', skills: ['JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 'AWS', 'DevOps'] },
  { value: 'design', label: 'Design', skills: ['UI/UX Design', 'Figma', 'Product Design', 'Graphic Design'] },
  { value: 'data', label: 'Data & AI', skills: ['Data Analysis', 'Machine Learning', 'Data Science', 'SQL', 'TensorFlow'] },
  { value: 'business', label: 'Business', skills: ['Product Management', 'Marketing', 'Sales', 'Finance', 'Strategy'] },
  { value: 'operations', label: 'Operations', skills: ['Project Management', 'Operations', 'HR', 'Legal'] },
];

const INTEREST_CATEGORIES = [
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'edtech', label: 'Edtech' },
  { value: 'saas', label: 'SaaS' },
  { value: 'ai', label: 'AI/ML' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'climate', label: 'Climate' },
  { value: 'social', label: 'Social Impact' },
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
  const [selectedSkillCategories, setSelectedSkillCategories] = useState<string[]>([]);
  const [selectedInterestCategories, setSelectedInterestCategories] = useState<string[]>([]);
  const [selectedClub, setSelectedClub] = useState<string>('all');

  const selectedSkills = selectedSkillCategories.flatMap(
    cat => SKILL_CATEGORIES.find(c => c.value === cat)?.skills || []
  );

  const interestMapping: Record<string, string[]> = {
    fintech: ['Fintech'],
    healthtech: ['Healthtech'],
    edtech: ['Edtech'],
    saas: ['SaaS'],
    ai: ['AI/ML Applications', 'LLMs/GenAI'],
    ecommerce: ['E-commerce', 'Marketplaces'],
    consumer: ['Consumer Apps'],
    enterprise: ['Enterprise Software'],
    climate: ['Climate Tech', 'Clean Energy'],
    social: ['Social Impact'],
  };

  const selectedInterests = selectedInterestCategories.flatMap(
    cat => interestMapping[cat] || []
  );

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

  const toggleSkillCategory = (category: string) => {
    setSelectedSkillCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleInterestCategory = (category: string) => {
    setSelectedInterestCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRoles([]);
    setSelectedSkillCategories([]);
    setSelectedInterestCategories([]);
    setSelectedClub('all');
  };

  const hasActiveFilters = selectedRoles.length > 0 || selectedSkillCategories.length > 0 || selectedInterestCategories.length > 0 || (selectedClub && selectedClub !== 'all');

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
        inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
        transition-all duration-150 border
        ${selected 
          ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
          : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50'
        }
      `}
    >
      {selected && <Check className="w-3.5 h-3.5" />}
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-semibold text-foreground">Find Collaborators</h1>
        <p className="text-muted-foreground mt-1">
          Filter by skills, interests, or role to find the right teammates
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Name or University</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-collaborators"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Club Affiliation</label>
                <Select value={selectedClub} onValueChange={setSelectedClub}>
                  <SelectTrigger data-testid="select-club">
                    <SelectValue placeholder="All clubs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clubs</SelectItem>
                    {CLUB_OPTIONS.map(club => (
                      <SelectItem key={club} value={club}>{club}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Roles</label>
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

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Skills</label>
              <div className="flex flex-wrap gap-2">
                {SKILL_CATEGORIES.map(cat => (
                  <FilterChip
                    key={cat.value}
                    label={cat.label}
                    selected={selectedSkillCategories.includes(cat.value)}
                    onClick={() => toggleSkillCategory(cat.value)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_CATEGORIES.map(cat => (
                  <FilterChip
                    key={cat.value}
                    label={cat.label}
                    selected={selectedInterestCategories.includes(cat.value)}
                    onClick={() => toggleInterestCategory(cat.value)}
                  />
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {selectedRoles.length + selectedSkillCategories.length + selectedInterestCategories.length + (selectedClub !== 'all' ? 1 : 0)} filter(s) applied
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="w-4 h-4 mr-1.5" />
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex items-center justify-between">
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
          {collaborators.map((collab, index) => (
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
                    
                    {collab.skills && collab.skills.length > 0 && (
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
          ))}
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
              ? 'No one matches your current filters. Try different criteria.' 
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
