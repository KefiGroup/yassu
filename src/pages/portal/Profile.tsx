import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Save, Loader2, Camera, Award, PartyPopper } from 'lucide-react';
import { GroupedMultiSelect } from '@/components/GroupedMultiSelect';
import { SKILL_CATEGORIES, INTEREST_CATEGORIES } from '@/lib/profileOptions';
import { AvatarUploadDialog } from '@/components/AvatarUploadDialog';
import { LinkedInImport } from '@/components/LinkedInImport';
import { apiRequest } from '@/lib/api';

interface ProfileBadge {
  id: string;
  userId: number;
  badgeType: 'ambassador' | 'advisor';
  awardedAt: string;
}

interface University {
  id: string;
  name: string;
  shortName: string | null;
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [badges, setBadges] = useState<ProfileBadge[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true);
      searchParams.delete('welcome');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [formData, setFormData] = useState({
    fullName: '',
    bio: '',
    major: '',
    graduationYear: '',
    universityId: '',
    otherUniversity: '',
    availability: '',
    linkedinUrl: '',
    skills: [] as string[],
    interests: [] as string[],
    clubType: '',
    otherClubType: '',
  });

  useEffect(() => {
    async function fetchUniversities() {
      try {
        const data = await api.universities.list();
        setUniversities(data);
      } catch {
        setUniversities([]);
      }
    }
    fetchUniversities();
  }, []);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const data = await apiRequest<ProfileBadge[]>('/profile/badges');
        setBadges(data);
      } catch {
        setBadges([]);
      }
    }
    if (user) {
      fetchBadges();
    }
  }, [user]);

  useEffect(() => {
    if (profile && !initialLoadDone) {
      const hasOtherUniversity = !profile.universityId && profile.otherUniversity;
      const clubValue = (profile as any).clubType || '';
      const isOtherClub = clubValue.startsWith('Other: ');
      setFormData({
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        major: profile.major || '',
        graduationYear: profile.graduationYear?.toString() || '',
        universityId: hasOtherUniversity ? 'other' : (profile.universityId || ''),
        otherUniversity: profile.otherUniversity || '',
        availability: profile.availability || '',
        linkedinUrl: profile.linkedinUrl || '',
        skills: profile.skills || [],
        interests: profile.interests || [],
        clubType: isOtherClub ? 'other' : clubValue,
        otherClubType: isOtherClub ? clubValue.replace('Other: ', '') : '',
      });
      setInitialLoadDone(true);
    }
  }, [profile, initialLoadDone]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    
    const isOtherUniversity = formData.universityId === 'other';
    const universityIdToSave = isOtherUniversity ? null : (formData.universityId || null);
    const otherUniversityToSave = isOtherUniversity ? formData.otherUniversity : null;
    
    try {
      const clubTypeToSave = formData.clubType === 'other' 
        ? (formData.otherClubType ? `Other: ${formData.otherClubType}` : null)
        : (formData.clubType || null);

      await api.profile.update({
        fullName: formData.fullName,
        bio: formData.bio,
        major: formData.major,
        graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
        universityId: universityIdToSave,
        otherUniversity: otherUniversityToSave,
        availability: formData.availability || null,
        linkedinUrl: formData.linkedinUrl || null,
        skills: formData.skills,
        interests: formData.interests,
        clubType: clubTypeToSave,
        onboardingCompleted: true,
      });

      await refreshProfile();
      toast({
        title: 'Profile saved',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error saving profile',
        description: error instanceof Error ? error.message : 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkillsChange = (skills: string[]) => {
    setFormData({ ...formData, skills });
  };

  const handleInterestsChange = (interests: string[]) => {
    setFormData({ ...formData, interests });
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isUniversityMissing = !formData.universityId || (formData.universityId === 'other' && !formData.otherUniversity.trim());

  const handleAvatarSave = async (croppedImageBlob: Blob) => {
    try {
      // Create form data with the image
      const formData = new FormData();
      formData.append('avatar', croppedImageBlob, 'avatar.png');

      // Upload directly to server
      const uploadResponse = await fetch('/api/profile/avatar/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload avatar');
      }

      await refreshProfile();
      toast({
        title: 'Photo updated',
        description: 'Your profile photo has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload photo',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Alert className="border-primary/20 bg-primary/5" data-testid="alert-welcome">
            <PartyPopper className="h-5 w-5 text-primary" />
            <AlertTitle className="text-lg">Welcome to Yassu!</AlertTitle>
            <AlertDescription>
              We're excited to have you join our community of university entrepreneurs. 
              Complete your profile below to connect with co-founders, advisors, and ambassadors who can help bring your ideas to life.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">
          Complete your profile to unlock all features and get matched with teammates
        </p>
      </motion.div>


      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatarUrl || undefined} />
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {getInitials(formData.fullName)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full shadow-md"
                  onClick={() => setAvatarDialogOpen(true)}
                  data-testid="button-edit-avatar"
                >
                  <Camera className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1">
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your profile details</CardDescription>
                {badges.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {badges.map((badge) => (
                      <Badge key={badge.id} variant="secondary" className="gap-1">
                        <Award className="w-3 h-3" />
                        {badge.badgeType === 'ambassador' ? 'Yassu Ambassador' : 'Yassu Advisor'}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Jane Doe"
                  data-testid="input-fullname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ''} disabled className="bg-muted" data-testid="input-email" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio / Summary</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself, your experience, and what you're looking for..."
                rows={5}
                data-testid="input-bio"
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>This will be displayed on your public profile.</p>
                <p className="text-muted-foreground/80">
                  Tip: You can copy your bio from LinkedIn by going to your profile, clicking "About", then copying the text.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Select
                  value={formData.universityId}
                  onValueChange={(value) => setFormData({ ...formData, universityId: value, otherUniversity: value === 'other' ? formData.otherUniversity : '' })}
                >
                  <SelectTrigger data-testid="select-university">
                    <SelectValue placeholder="Select university" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" className="max-h-60">
                    {universities.map((uni) => (
                      <SelectItem key={uni.id} value={uni.id}>
                        {uni.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other (Not Listed)</SelectItem>
                  </SelectContent>
                </Select>
                {formData.universityId === 'other' && (
                  <Input
                    id="otherUniversity"
                    value={formData.otherUniversity}
                    onChange={(e) => setFormData({ ...formData, otherUniversity: e.target.value })}
                    placeholder="Enter your university name"
                    className="mt-2"
                    data-testid="input-other-university"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Major</Label>
                <Input
                  id="major"
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  placeholder="Computer Science"
                  data-testid="input-major"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="graduationYear">Graduation Year</Label>
                <Input
                  id="graduationYear"
                  type="number"
                  value={formData.graduationYear}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  placeholder="2025"
                  min="2020"
                  max="2030"
                  data-testid="input-graduation-year"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Select
                  value={formData.availability}
                  onValueChange={(value) => setFormData({ ...formData, availability: value })}
                >
                  <SelectTrigger data-testid="select-availability">
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="weekends">Weekends only</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clubType">Club Affiliation</Label>
              <Select
                value={formData.clubType}
                onValueChange={(value) => setFormData({ ...formData, clubType: value, otherClubType: value === 'other' ? formData.otherClubType : '' })}
              >
                <SelectTrigger data-testid="select-club-type">
                  <SelectValue placeholder="Select your club affiliation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai-data-science">AI / Data Science Clubs</SelectItem>
                  <SelectItem value="business-school">Business School Associations</SelectItem>
                  <SelectItem value="computer-science">Computer Science Clubs</SelectItem>
                  <SelectItem value="consulting">Consulting Clubs</SelectItem>
                  <SelectItem value="design-ux">Design / UX Clubs</SelectItem>
                  <SelectItem value="engineering">Engineering Societies</SelectItem>
                  <SelectItem value="entrepreneurship">Entrepreneurship Clubs</SelectItem>
                  <SelectItem value="innovation-incubator">Innovation / Incubator Clubs</SelectItem>
                  <SelectItem value="product-management">Product Management Clubs</SelectItem>
                  <SelectItem value="startup-founder">Startup / Founder Clubs</SelectItem>
                  <SelectItem value="venture-capital">Venture Capital Clubs</SelectItem>
                  <SelectItem value="other">Others (specify)</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
              {formData.clubType === 'other' && (
                <Input
                  id="otherClubType"
                  value={formData.otherClubType}
                  onChange={(e) => setFormData({ ...formData, otherClubType: e.target.value })}
                  placeholder="Enter your club name"
                  className="mt-2"
                  data-testid="input-other-club-type"
                />
              )}
            </div>

            <GroupedMultiSelect
              label="Skills"
              categories={SKILL_CATEGORIES}
              selected={formData.skills}
              onChange={handleSkillsChange}
              placeholder="Select or add skills..."
              badgeVariant="secondary"
            />

            <GroupedMultiSelect
              label="Interests"
              categories={INTEREST_CATEGORIES}
              selected={formData.interests}
              onChange={handleInterestsChange}
              placeholder="Select or add interests..."
              badgeVariant="outline"
            />

            <div className="space-y-4">
              <Label className="text-base">LinkedIn Profile</Label>
              <LinkedInImport
                linkedinUrl={formData.linkedinUrl}
                onLinkedInUrlChange={(url) => setFormData({ ...formData, linkedinUrl: url })}
                onDataImported={(data) => {
                  setFormData({
                    ...formData,
                    fullName: data.fullName || formData.fullName,
                    bio: data.bio || formData.bio,
                    skills: data.skills || formData.skills,
                  });
                }}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full" data-testid="button-save-profile">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <AvatarUploadDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        onSave={handleAvatarSave}
        currentAvatarUrl={profile?.avatarUrl || undefined}
      />
    </div>
  );
}
