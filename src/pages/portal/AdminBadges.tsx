import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, Shield, Award, Users, ShieldCheck, ShieldX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface ProfileBadge {
  id: string;
  userId: number;
  badgeType: 'ambassador' | 'advisor';
  awardedBy: number;
  awardedAt: string;
}

interface ProfileWithBadges {
  id: number;
  userId: number;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  badges: ProfileBadge[];
}

export default function AdminBadges() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<ProfileWithBadges[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const result = await apiRequest<{ isAdmin: boolean }>('/admin/check');
        setIsAdmin(result.isAdmin);
        
        if (!result.isAdmin) {
          toast({
            title: 'Access Denied',
            description: 'You do not have admin privileges.',
            variant: 'destructive',
          });
          navigate('/portal/dashboard');
          return;
        }
        
        const profilesData = await apiRequest<ProfileWithBadges[]>('/admin/profiles');
        setProfiles(profilesData);
      } catch (error) {
        console.error('Admin check failed:', error);
        navigate('/portal/dashboard');
      } finally {
        setLoading(false);
      }
    }
    
    checkAdmin();
  }, [navigate, toast]);

  const handleAwardBadge = async (userId: number, badgeType: 'ambassador' | 'advisor') => {
    setActionLoading(`${userId}-${badgeType}-award`);
    try {
      await apiRequest('/admin/badges', {
        method: 'POST',
        body: JSON.stringify({ userId, badgeType }),
      });
      
      const profilesData = await apiRequest<ProfileWithBadges[]>('/admin/profiles');
      setProfiles(profilesData);
      
      toast({
        title: 'Badge Awarded',
        description: `${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} badge has been awarded.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to award badge.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeBadge = async (userId: number, badgeType: 'ambassador' | 'advisor') => {
    setActionLoading(`${userId}-${badgeType}-revoke`);
    try {
      await apiRequest(`/admin/badges/${userId}/${badgeType}`, {
        method: 'DELETE',
      });
      
      const profilesData = await apiRequest<ProfileWithBadges[]>('/admin/profiles');
      setProfiles(profilesData);
      
      toast({
        title: 'Badge Revoked',
        description: `${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} badge has been revoked.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke badge.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProfiles = profiles.filter((profile) =>
    (profile.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (profile.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const hasBadge = (profile: ProfileWithBadges, type: 'ambassador' | 'advisor') =>
    profile.badges.some(b => b.badgeType === type);

  if (loading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Badge Management</h1>
        </div>
        <p className="text-muted-foreground">
          Award or revoke Ambassador and Advisor badges to platform members.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Platform Members
          </CardTitle>
          <CardDescription>
            Search for members and manage their badges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-members"
            />
          </div>

          <div className="space-y-3">
            {filteredProfiles.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No members found matching your search.' : 'No members registered yet.'}
              </p>
            ) : (
              filteredProfiles.map((profile, index) => (
                <motion.div
                  key={profile.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={profile.avatarUrl || undefined} />
                        <AvatarFallback>
                          {(profile.fullName || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{profile.fullName || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                        <div className="flex gap-2 mt-1">
                          {hasBadge(profile, 'ambassador') && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Award className="w-3 h-3" />
                              Ambassador
                            </Badge>
                          )}
                          {hasBadge(profile, 'advisor') && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Award className="w-3 h-3" />
                              Advisor
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {hasBadge(profile, 'ambassador') ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeBadge(profile.userId, 'ambassador')}
                          disabled={actionLoading === `${profile.userId}-ambassador-revoke`}
                          data-testid={`button-revoke-ambassador-${profile.userId}`}
                        >
                          {actionLoading === `${profile.userId}-ambassador-revoke` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldX className="w-4 h-4 mr-1" />
                          )}
                          Revoke Ambassador
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAwardBadge(profile.userId, 'ambassador')}
                          disabled={actionLoading === `${profile.userId}-ambassador-award`}
                          data-testid={`button-award-ambassador-${profile.userId}`}
                        >
                          {actionLoading === `${profile.userId}-ambassador-award` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 mr-1" />
                          )}
                          Award Ambassador
                        </Button>
                      )}
                      {hasBadge(profile, 'advisor') ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeBadge(profile.userId, 'advisor')}
                          disabled={actionLoading === `${profile.userId}-advisor-revoke`}
                          data-testid={`button-revoke-advisor-${profile.userId}`}
                        >
                          {actionLoading === `${profile.userId}-advisor-revoke` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldX className="w-4 h-4 mr-1" />
                          )}
                          Revoke Advisor
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAwardBadge(profile.userId, 'advisor')}
                          disabled={actionLoading === `${profile.userId}-advisor-award`}
                          data-testid={`button-award-advisor-${profile.userId}`}
                        >
                          {actionLoading === `${profile.userId}-advisor-award` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 mr-1" />
                          )}
                          Award Advisor
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
