import { useState, useEffect, useCallback } from 'react';
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
import { Save, CheckCircle, AlertCircle, Camera, Loader2, Linkedin } from 'lucide-react';
import { LinkedInImportModal } from '@/components/LinkedInImportModal';
import { GroupedMultiSelect } from '@/components/GroupedMultiSelect';
import { SKILL_CATEGORIES, INTEREST_CATEGORIES } from '@/lib/profileOptions';

interface University {
  id: string;
  name: string;
  shortName: string | null;
}

export default function Profile() {
  const { user, profile, refreshProfile, isVerified } = useAuth();
  const { toast } = useToast();
  const [universities, setUniversities] = useState<University[]>([]);
  const [saving, setSaving] = useState(false);
  const [linkedInModalOpen, setLinkedInModalOpen] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
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
      setFormData({
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        major: profile.major || '',
        graduationYear: profile.graduationYear?.toString() || '',
        universityId: profile.universityId || '',
        otherUniversity: '',
        availability: profile.availability || '',
        linkedinUrl: profile.linkedinUrl || '',
        skills: profile.skills || [],
        interests: profile.interests || [],
      });
      setInitialLoadDone(true);
    }
  }, [profile, initialLoadDone]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    
    const universityIdToSave = formData.universityId === 'other' ? null : (formData.universityId || null);
    
    try {
      await api.profile.update({
        fullName: formData.fullName,
        bio: formData.bio,
        major: formData.major,
        graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
        universityId: universityIdToSave,
        availability: formData.availability || null,
        linkedinUrl: formData.linkedinUrl || null,
        skills: formData.skills,
        interests: formData.interests,
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

  const handleLinkedInImport = useCallback((bio: string, skills: string[]) => {
    const mergedSkills = [...new Set([...formData.skills, ...skills])];
    setFormData({ 
      ...formData, 
      bio,
      skills: mergedSkills,
    });
  }, [formData]);

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
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className={isVerified ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}>
          <CardContent className="p-4 flex items-center gap-3">
            {isVerified ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">Verified Member</p>
                  <p className="text-sm text-muted-foreground">You have full access to all features</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div className="flex-1">
                  <p className="font-medium text-amber-700 dark:text-amber-400">Pending Verification</p>
                  <p className="text-sm text-muted-foreground">
                    {isUniversityMissing 
                      ? 'Please select your university below to enable verification'
                      : 'Complete your profile with university details to get verified'}
                  </p>
                </div>
                {isUniversityMissing && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    University Required
                  </Badge>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatarUrl || undefined} />
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {getInitials(formData.fullName)}
                  </AvatarFallback>
                </Avatar>
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
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label htmlFor="bio">Bio / Summary</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLinkedInModalOpen(true)}
                  className="gap-2"
                  data-testid="button-import-linkedin"
                >
                  <Linkedin className="w-4 h-4" />
                  Import from LinkedIn
                </Button>
              </div>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself, your experience, and what you're looking for..."
                rows={4}
                data-testid="input-bio"
              />
              <p className="text-xs text-muted-foreground">This will be displayed on your public profile.</p>
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

      <LinkedInImportModal
        open={linkedInModalOpen}
        onOpenChange={setLinkedInModalOpen}
        onApply={handleLinkedInImport}
      />
    </div>
  );
}
