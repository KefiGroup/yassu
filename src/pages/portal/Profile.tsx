import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Save, Loader2, Camera } from 'lucide-react';
import { GroupedMultiSelect } from '@/components/GroupedMultiSelect';
import { SKILL_CATEGORIES, INTEREST_CATEGORIES } from '@/lib/profileOptions';
import { AvatarUploadDialog } from '@/components/AvatarUploadDialog';

interface University {
  id: string;
  name: string;
  shortName: string | null;
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [universities, setUniversities] = useState<University[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
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
    yassuRole: '' as '' | 'ambassador' | 'advisor',
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
    if (profile && !initialLoadDone) {
      const hasOtherUniversity = !profile.universityId && profile.otherUniversity;
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
        yassuRole: (profile as any).yassuRole || '',
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
        yassuRole: formData.yassuRole || null,
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
      const formData = new FormData();
      formData.append('avatar', croppedImageBlob, 'avatar.png');

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
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
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your profile details</CardDescription>
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
                  <SelectContent>
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
              <Label htmlFor="yassuRole">Yassu Role (Optional)</Label>
              <Select
                value={formData.yassuRole}
                onValueChange={(value) => setFormData({ ...formData, yassuRole: value as '' | 'ambassador' | 'advisor' })}
              >
                <SelectTrigger data-testid="select-yassu-role">
                  <SelectValue placeholder="Select if you want to be an Ambassador or Advisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambassador">Yassu Ambassador (Undergrad Student)</SelectItem>
                  <SelectItem value="advisor">Yassu Advisor (Graduated Professional)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ambassadors are current university students who represent Yassu on campus. 
                Advisors are graduated professionals who mentor student founders.
              </p>
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
              <Label className="text-base">Links</Label>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="linkedinUrl" className="text-sm text-muted-foreground">LinkedIn</Label>
                  <Input
                    id="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                    data-testid="input-linkedin-url"
                  />
                </div>
              </div>
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
