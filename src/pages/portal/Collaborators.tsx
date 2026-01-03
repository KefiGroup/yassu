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
import { Users, Search, X } from 'lucide-react';
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
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedSkillCategory, setSelectedSkillCategory] = useState<string>('all');
  const [selectedInterestCategory, setSelectedInterestCategory] = useState<string>('all');
  const [selectedClub, setSelectedClub] = useState<string>('all');

  const selectedSkills = selectedSkillCategory !== 'all' 
    ? SKILL_CATEGORIES.find(c => c.value === selectedSkillCategory)?.skills || []
    : [];

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

  const selectedInterests = selectedInterestCategory !== 'all'
    ? interestMapping[selectedInterestCategory] || []
    : [];

  const filters = {
    search: searchTerm || undefined,
    roles: selectedRole !== 'all' ? [selectedRole] : undefined,
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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRole('all');
    setSelectedSkillCategory('all');
    setSelectedInterestCategory('all');
    setSelectedClub('all');
  };

  const hasActiveFilters = selectedRole !== 'all' || selectedSkillCategory !== 'all' || selectedInterestCategory !== 'all' || selectedClub !== 'all';

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {ROLE_OPTIONS.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Skills</label>
                <Select value={selectedSkillCategory} onValueChange={setSelectedSkillCategory}>
                  <SelectTrigger data-testid="select-skills">
                    <SelectValue placeholder="All skills" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All skills</SelectItem>
                    {SKILL_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Interests</label>
                <Select value={selectedInterestCategory} onValueChange={setSelectedInterestCategory}>
                  <SelectTrigger data-testid="select-interests">
                    <SelectValue placeholder="All interests" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All interests</SelectItem>
                    {INTEREST_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-end pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="w-4 h-4 mr-1.5" />
                  Clear all filters
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
