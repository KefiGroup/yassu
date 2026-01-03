import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Shield, Award, Users, ShieldCheck, ShieldX, Lightbulb, Lock, Globe, UserCog, Eye, ArrowLeft } from 'lucide-react';
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

interface Idea {
  id: string;
  title: string;
  problem: string | null;
  creatorId: number;
  isPublic: boolean;
  stage: string | null;
  createdAt: string;
}

interface AdminUser {
  userId: number;
  email: string;
  fullName: string | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<ProfileWithBadges[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ideaSearchQuery, setIdeaSearchQuery] = useState('');
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
          navigate('/portal');
          return;
        }
        
        const [profilesData, ideasData, adminsData] = await Promise.all([
          apiRequest<ProfileWithBadges[]>('/admin/profiles'),
          apiRequest<Idea[]>('/admin/ideas'),
          apiRequest<AdminUser[]>('/admin/admins')
        ]);
        
        setProfiles(profilesData);
        setIdeas(ideasData);
        setAdmins(adminsData);
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

  const handleGrantAdmin = async (userId: number) => {
    setActionLoading(`admin-${userId}-grant`);
    try {
      await apiRequest('/admin/admins', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      
      const adminsData = await apiRequest<AdminUser[]>('/admin/admins');
      setAdmins(adminsData);
      
      toast({
        title: 'Admin Granted',
        description: 'User has been granted admin privileges.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to grant admin privileges.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAdmin = async (userId: number) => {
    setActionLoading(`admin-${userId}-revoke`);
    try {
      await apiRequest(`/admin/admins/${userId}`, {
        method: 'DELETE',
      });
      
      const adminsData = await apiRequest<AdminUser[]>('/admin/admins');
      setAdmins(adminsData);
      
      toast({
        title: 'Admin Revoked',
        description: 'User admin privileges have been revoked.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke admin privileges.',
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

  const filteredIdeas = ideas.filter((idea) =>
    idea.title.toLowerCase().includes(ideaSearchQuery.toLowerCase()) ||
    (idea.problem?.toLowerCase() || '').includes(ideaSearchQuery.toLowerCase())
  );

  const hasBadge = (profile: ProfileWithBadges, type: 'ambassador' | 'advisor') =>
    profile.badges.some(b => b.badgeType === type);

  const isCurrentAdmin = (userId: number) =>
    admins.some(a => a.userId === userId);

  if (loading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/portal')}
            data-testid="button-back-to-portal"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Button>
        </div>
        <p className="text-muted-foreground">
          Manage badges, view all ideas, and control admin access.
        </p>
      </motion.div>

      <Tabs defaultValue="badges" className="space-y-4">
        <TabsList>
          <TabsTrigger value="badges" className="gap-2" data-testid="tab-badges">
            <Award className="w-4 h-4" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="ideas" className="gap-2" data-testid="tab-ideas">
            <Lightbulb className="w-4 h-4" />
            All Ideas
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2" data-testid="tab-admins">
            <UserCog className="w-4 h-4" />
            Admin Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="badges">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Badge Management
              </CardTitle>
              <CardDescription>
                Award or revoke Ambassador and Advisor badges to platform members.
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

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
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
                      transition={{ duration: 0.2, delay: index * 0.02 }}
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
        </TabsContent>

        <TabsContent value="ideas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                All Ideas ({ideas.length})
              </CardTitle>
              <CardDescription>
                View all ideas on the platform, including private ones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search ideas..."
                  value={ideaSearchQuery}
                  onChange={(e) => setIdeaSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-ideas"
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredIdeas.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    {ideaSearchQuery ? 'No ideas found matching your search.' : 'No ideas posted yet.'}
                  </p>
                ) : (
                  filteredIdeas.map((idea, index) => (
                    <motion.div
                      key={idea.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                    >
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{idea.title}</p>
                            {idea.isPublic ? (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Globe className="w-3 h-3" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Lock className="w-3 h-3" />
                                Private
                              </Badge>
                            )}
                            {idea.stage && (
                              <Badge variant="outline" className="text-xs">
                                {idea.stage.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {idea.problem || 'No problem description'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(idea.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Link to={`/portal/ideas/${idea.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-idea-${idea.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Admin Access Management
              </CardTitle>
              <CardDescription>
                Grant or revoke admin privileges to platform members.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Current Admins ({admins.length})</h3>
                <div className="space-y-2">
                  {admins.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No admins configured.</p>
                  ) : (
                    admins.map((admin) => (
                      <div key={admin.userId} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                        <div>
                          <p className="font-medium">{admin.fullName || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeAdmin(admin.userId)}
                          disabled={actionLoading === `admin-${admin.userId}-revoke`}
                          data-testid={`button-revoke-admin-${admin.userId}`}
                        >
                          {actionLoading === `admin-${admin.userId}-revoke` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldX className="w-4 h-4 mr-1" />
                          )}
                          Revoke Admin
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Grant Admin Access</h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members to grant admin..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-grant-admin"
                  />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredProfiles.filter(p => !isCurrentAdmin(p.userId)).slice(0, 10).map((profile) => (
                    <div key={profile.userId} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={profile.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {(profile.fullName || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{profile.fullName || 'No name'}</p>
                          <p className="text-xs text-muted-foreground">{profile.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGrantAdmin(profile.userId)}
                        disabled={actionLoading === `admin-${profile.userId}-grant`}
                        data-testid={`button-grant-admin-${profile.userId}`}
                      >
                        {actionLoading === `admin-${profile.userId}-grant` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 mr-1" />
                        )}
                        Grant Admin
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
