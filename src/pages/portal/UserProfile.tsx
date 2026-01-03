import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { ArrowLeft, Award, GraduationCap, Briefcase, Heart, Users, Lightbulb } from 'lucide-react';
import { ConnectionButton } from '@/components/ConnectionButton';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';

interface ProfileBadge {
  id: string;
  userId: number;
  badgeType: 'ambassador' | 'advisor';
  awardedAt: string;
}

interface Idea {
  id: string;
  title: string;
  problem: string;
  stage: string;
}

interface PublicProfile {
  profile: {
    id: number;
    userId: number;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    skills: string[] | null;
    interests: string[] | null;
    clubType: string | null;
    major: string | null;
    graduationYear: number | null;
    availability: string | null;
    linkedinUrl: string | null;
  };
  university: { name: string; shortName: string | null } | null;
  roles: string[];
  badges: ProfileBadge[];
  ideas: Idea[];
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const numericUserId = userId ? parseInt(userId) : null;

  const { data, isLoading, error } = useQuery<PublicProfile>({
    queryKey: ['/api/users', numericUserId],
    queryFn: () => apiRequest<PublicProfile>(`/users/${numericUserId}`),
    enabled: !!numericUserId,
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link to="/portal/collaborators">
          <Button variant="ghost" size="sm" data-testid="button-back-collaborators">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Collaborators
          </Button>
        </Link>
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">User not found</h3>
            <p className="text-muted-foreground">This profile may be private or doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, university, roles, badges, ideas } = data;
  const isOwnProfile = user?.id === profile.userId;
  
  // Filter out roles that are already shown as awarded badges to avoid duplicates
  const badgeTypes = badges.map(b => b.badgeType);
  const filteredRoles = roles.filter(role => !badgeTypes.includes(role as 'ambassador' | 'advisor'));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link to="/portal/collaborators">
          <Button variant="ghost" size="sm" data-testid="button-back-collaborators">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Collaborators
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Avatar className="w-20 h-20 shrink-0">
                <AvatarImage src={profile.avatarUrl || undefined} alt={profile.fullName || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {getInitials(profile.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <CardTitle className="text-2xl" data-testid="text-profile-name">
                    {profile.fullName || 'Anonymous'}
                  </CardTitle>
                  {filteredRoles.map(role => (
                    <Badge key={role} variant={getRoleBadgeVariant(role)} className="capitalize" data-testid={`badge-role-${role}`}>
                      {role}
                    </Badge>
                  ))}
                </div>
                
                {badges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {badges.map(badge => (
                      <Badge key={badge.id} variant="outline" className="gap-1" data-testid={`badge-awarded-${badge.badgeType}`}>
                        <Award className="w-3 h-3" />
                        {badge.badgeType === 'ambassador' ? 'Yassu Ambassador' : 'Yassu Advisor'}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {university && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <GraduationCap className="w-4 h-4" />
                    <span>{university.name}</span>
                    {profile.major && <span className="text-sm">| {profile.major}</span>}
                    {profile.graduationYear && <span className="text-sm">| Class of {profile.graduationYear}</span>}
                  </div>
                )}
                
                {!isOwnProfile && (
                  <div className="mt-4">
                    <ConnectionButton
                      targetUserId={profile.userId}
                      currentUserId={user?.id}
                      data-testid="button-connect-profile"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          
          {profile.bio && (
            <CardContent className="pt-0">
              <p className="text-muted-foreground" data-testid="text-profile-bio">{profile.bio}</p>
            </CardContent>
          )}
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {profile.skills && profile.skills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" data-testid={`badge-skill-${i}`}>
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Interests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, i) => (
                    <Badge key={i} variant="outline" data-testid={`badge-interest-${i}`}>
                      {interest}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {profile.clubType && profile.clubType !== 'None' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Club Affiliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground" data-testid="text-club-affiliation">{profile.clubType}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {ideas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Ideas ({ideas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ideas.map(idea => (
                  <Link 
                    key={idea.id} 
                    to={`/portal/ideas/${idea.id}`}
                    className="block p-3 rounded-md bg-muted/50 hover-elevate"
                    data-testid={`link-idea-${idea.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium">{idea.title}</h4>
                      <Badge variant="outline" className="capitalize text-xs">{idea.stage.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{idea.problem}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {profile.availability && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground" data-testid="text-availability">{profile.availability}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
