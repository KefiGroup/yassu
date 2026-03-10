import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
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
import { Save, Loader2, Camera, Award, PartyPopper, Factory, Sparkles, X, Check, ChevronDown } from 'lucide-react';
import { GroupedMultiSelect } from '@/components/GroupedMultiSelect';
import { SKILL_CATEGORIES, INTEREST_CATEGORIES } from '@/lib/profileOptions';
import { AvatarUploadDialog } from '@/components/AvatarUploadDialog';
import { PortfolioSection } from '@/components/PortfolioSection';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const brand = useBranding();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [badges, setBadges] = useState<ProfileBadge[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [allIndustries, setAllIndustries] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<number[]>([]);
  const [suggestedIndustries, setSuggestedIndustries] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [suggestingIndustries, setSuggestingIndustries] = useState(false);
  const [industriesLoaded, setIndustriesLoaded] = useState(false);
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [savingIndustries, setSavingIndustries] = useState(false);

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
    // Enhanced Profile 2.0 fields (optional)
    headline: '',
    portfolioUrl: '',
    githubUrl: ''
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
    async function fetchIndustries() {
      try {
        const [all, saved] = await Promise.all([
          apiRequest<{ id: number; name: string; slug: string }[]>('/industries'),
          apiRequest<{ id: number; name: string; slug: string }[]>('/profile/industries'),
        ]);
        setAllIndustries(all);
        setSelectedIndustryIds(saved.map(i => i.id));
        setIndustriesLoaded(true);
      } catch {
        setIndustriesLoaded(true);
      }
    }
    if (user) {
      fetchIndustries();
    }
  }, [user]);

  useEffect(() => {
    if (profile && user && !initialLoadDone) {
      const hasOtherUniversity = !profile.universityId && profile.otherUniversity;
      const clubValue = (profile as any).clubType || '';
      const isOtherClub = clubValue.startsWith('Other: ');
      setFormData({
        fullName: user.fullName || '',
        bio: profile.bio || '',
        major: profile.major || '',
        graduationYear: profile.graduationYear?.toString() || '',
        universityId: brand.defaultUniversityId || (hasOtherUniversity ? 'other' : (profile.universityId || '')),
        otherUniversity: profile.otherUniversity || '',
        availability: profile.availability || '',
        linkedinUrl: profile.linkedinUrl || '',
        skills: profile.skills || [],
        interests: profile.interests || [],
        clubType: brand.defaultClubType || (isOtherClub ? 'other' : clubValue),
        otherClubType: isOtherClub ? clubValue.replace('Other: ', '') : '',
        headline: (profile as any).headline || '',
        portfolioUrl: profile.portfolioUrl || '',
        githubUrl: profile.githubUrl || ''
      });
      setInitialLoadDone(true);
    }
  }, [profile, user, initialLoadDone]);

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
        // Enhanced Profile 2.0 fields (optional)
        headline: formData.headline || null,
        portfolioUrl: formData.portfolioUrl || null,
        githubUrl: formData.githubUrl || null,
        onboardingCompleted: true,
      });

      await refreshProfile();
      trackEvent('profile_completed');
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

  const handleSuggestIndustries = async () => {
    setSuggestingIndustries(true);
    try {
      const suggested = await apiRequest<{ id: number; name: string; slug: string }[]>('/profile/industries/suggest', { method: 'POST' });
      const filtered = suggested.filter(s => !selectedIndustryIds.includes(s.id));
      setSuggestedIndustries(filtered);
    } catch {
      toast({ title: 'Could not generate suggestions', variant: 'destructive' });
    } finally {
      setSuggestingIndustries(false);
    }
  };

  const handleAddIndustry = async (industryId: number) => {
    if (selectedIndustryIds.length >= 5) {
      toast({ title: 'Maximum 5 industries', description: 'Remove one before adding another.', variant: 'destructive' });
      return;
    }
    const newIds = [...selectedIndustryIds, industryId];
    setSelectedIndustryIds(newIds);
    setSuggestedIndustries(prev => prev.filter(s => s.id !== industryId));
    setSavingIndustries(true);
    try {
      await apiRequest('/profile/industries', { method: 'POST', body: JSON.stringify({ industryIds: newIds }) });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSavingIndustries(false);
    }
  };

  const handleRemoveIndustry = async (industryId: number) => {
    const newIds = selectedIndustryIds.filter(id => id !== industryId);
    setSelectedIndustryIds(newIds);
    setSavingIndustries(true);
    try {
      await apiRequest('/profile/industries', { method: 'POST', body: JSON.stringify({ industryIds: newIds }) });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSavingIndustries(false);
    }
  };

  const handleAddAllSuggested = async () => {
    const available = 5 - selectedIndustryIds.length;
    const toAdd = suggestedIndustries.slice(0, available);
    const newIds = [...selectedIndustryIds, ...toAdd.map(s => s.id)];
    setSelectedIndustryIds(newIds);
    setSuggestedIndustries([]);
    setSavingIndustries(true);
    try {
      await apiRequest('/profile/industries', { method: 'POST', body: JSON.stringify({ industryIds: newIds }) });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSavingIndustries(false);
    }
  };

  const handleDismissSuggestion = (industryId: number) => {
    setSuggestedIndustries(prev => prev.filter(s => s.id !== industryId));
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
            <AlertTitle className="text-lg">
              Welcome to {brand.name}!
              {brand.id !== 'yassu' && (
                <span className="text-sm font-normal text-muted-foreground ml-2">(Powered by Yassu™)</span>
              )}
            </AlertTitle>
            <AlertDescription>
              We're excited to have you join our community of university entrepreneurs. 
              Complete your profile below to connect with collaborators, advisors, and ambassadors who can help bring your ideas to life.
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
                        {badge.badgeType === 'ambassador' ? 'Ambassador' : 'Advisor'}
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
                <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
              <Input
                id="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://www.linkedin.com/in/yourprofile"
                data-testid="input-linkedin-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">Professional Headline</Label>
              <Input
                id="headline"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="e.g., Product Designer | Ex-Google Intern | Stanford CS"
                data-testid="input-headline"
              />
              <p className="text-xs text-muted-foreground">
                A short, punchy description that appears next to your name
              </p>
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
                {formData.linkedinUrl && (
                  <p className="text-muted-foreground/80">
                    Tip:{' '}
                    <a
                      href={formData.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      Open your LinkedIn profile
                    </a>
                    {' '}→ click "About" → copy your bio text and paste it above.
                  </p>
                )}
                {!formData.linkedinUrl && (
                  <p className="text-muted-foreground/80">
                    Tip: Add your LinkedIn URL above, then we'll help you copy your bio from there.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                {brand.defaultUniversityId ? (
                  <Input
                    value={universities.find(u => u.id === brand.defaultUniversityId)?.name || 'University of California, Los Angeles'}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    data-testid="input-university-locked"
                  />
                ) : (
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
                )}
                {!brand.defaultUniversityId && formData.universityId === 'other' && (
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
              {brand.defaultClubType ? (
                <Input
                  value="Entrepreneurship Clubs"
                  disabled
                  className="bg-muted cursor-not-allowed"
                  data-testid="input-club-type-locked"
                />
              ) : (
                <>
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
                </>
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-muted-foreground" />
                  <Label>Industries</Label>
                </div>
                <span className="text-xs text-muted-foreground">{selectedIndustryIds.length}/5</span>
              </div>

              {selectedIndustryIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedIndustryIds.map(id => {
                    const ind = allIndustries.find(i => i.id === id);
                    if (!ind) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 pl-2 pr-1" data-testid={`badge-industry-${ind.slug}`}>
                        <Check className="w-3 h-3" />
                        {ind.name}
                        <button
                          onClick={() => handleRemoveIndustry(id)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                          data-testid={`button-remove-industry-${ind.slug}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {suggestedIndustries.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      Suggested for you
                    </div>
                    <button
                      onClick={handleAddAllSuggested}
                      className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition-colors"
                      data-testid="button-add-all-industries"
                    >
                      <Check className="w-3 h-3" />
                      Add all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedIndustries.map(ind => (
                      <Badge
                        key={ind.id}
                        variant="outline"
                        className="gap-1 pl-2 pr-1 cursor-pointer border-amber-300 dark:border-amber-700"
                        data-testid={`badge-suggested-${ind.slug}`}
                      >
                        <button onClick={() => handleAddIndustry(ind.id)} className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {ind.name}
                        </button>
                        <button
                          onClick={() => handleDismissSuggestion(ind.id)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Click to add, or x to dismiss</p>
                </div>
              )}

              <div className="flex gap-2">
                <Popover open={industryDropdownOpen} onOpenChange={setIndustryDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-between"
                      disabled={selectedIndustryIds.length >= 5}
                      data-testid="button-add-industry"
                    >
                      <span className="text-muted-foreground">Add more industries...</span>
                      <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <div className="p-2 max-h-64 overflow-y-auto space-y-0.5">
                      {allIndustries
                        .filter(ind => !selectedIndustryIds.includes(ind.id))
                        .map(ind => (
                          <div
                            key={ind.id}
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => {
                              handleAddIndustry(ind.id);
                              if (selectedIndustryIds.length >= 4) setIndustryDropdownOpen(false);
                            }}
                            data-testid={`option-industry-${ind.slug}`}
                          >
                            <span>{ind.name}</span>
                          </div>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {!suggestingIndustries && suggestedIndustries.length === 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSuggestIndustries}
                    disabled={suggestingIndustries || (!formData.bio && formData.skills.length === 0 && formData.interests.length === 0)}
                    data-testid="button-suggest-industries"
                    title="AI suggest industries"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                )}
                {suggestingIndustries && (
                  <Button variant="outline" size="icon" disabled>
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">Industries are auto-detected from your profile. Add or remove as needed.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                <Input
                  id="portfolioUrl"
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  placeholder="https://yourportfolio.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="githubUrl">GitHub URL</Label>
                <Input
                  id="githubUrl"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  placeholder="https://github.com/yourusername"
                />
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

      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <PortfolioSection userId={user.id} />
        </motion.div>
      )}

      <AvatarUploadDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        onSave={handleAvatarSave}
        currentAvatarUrl={profile?.avatarUrl || undefined}
      />
    </div>
  );
}
