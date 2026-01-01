import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { User, Save, Plus, X, CheckCircle, AlertCircle, Linkedin, Upload, ExternalLink, Loader2, Wand2 } from 'lucide-react';
import { firecrawlApi } from '@/lib/api/firecrawl';

interface University {
  id: string;
  name: string;
  short_name: string | null;
}

export default function Profile() {
  const { user, profile, refreshProfile, isVerified } = useAuth();
  const { toast } = useToast();
  const [universities, setUniversities] = useState<University[]>([]);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [linkedinDialogOpen, setLinkedinDialogOpen] = useState(false);
  const [scrapeDialogOpen, setScrapeDialogOpen] = useState(false);
  const [linkedinUrlToScrape, setLinkedinUrlToScrape] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [linkedinImportData, setLinkedinImportData] = useState({
    headline: '',
    summary: '',
    skills: '',
    experience: '',
  });

  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    major: '',
    graduation_year: '',
    university_id: '',
    availability: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    skills: [] as string[],
    interests: [] as string[],
  });

  useEffect(() => {
    async function fetchUniversities() {
      const { data } = await supabase
        .from('universities')
        .select('id, name, short_name')
        .order('name');
      if (data) setUniversities(data);
    }
    fetchUniversities();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        major: profile.major || '',
        graduation_year: profile.graduation_year?.toString() || '',
        university_id: profile.university_id || '',
        availability: profile.availability || '',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
        portfolio_url: profile.portfolio_url || '',
        skills: profile.skills || [],
        interests: profile.interests || [],
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        bio: formData.bio,
        major: formData.major,
        graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
        university_id: formData.university_id || null,
        availability: formData.availability || null,
        linkedin_url: formData.linkedin_url || null,
        github_url: formData.github_url || null,
        portfolio_url: formData.portfolio_url || null,
        skills: formData.skills,
        interests: formData.interests,
        onboarding_completed: true,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      toast({
        title: 'Error saving profile',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      await refreshProfile();
      toast({
        title: 'Profile saved',
        description: 'Your profile has been updated successfully.',
      });
    }
  };

  const handleLinkedinImport = () => {
    // Parse skills from comma-separated string
    const importedSkills = linkedinImportData.skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Combine existing and new skills, removing duplicates
    const combinedSkills = [...new Set([...formData.skills, ...importedSkills])];
    
    // Combine headline and summary for bio
    const combinedBio = [linkedinImportData.headline, linkedinImportData.summary, linkedinImportData.experience]
      .filter(s => s.trim())
      .join('\n\n');

    setFormData({
      ...formData,
      bio: combinedBio || formData.bio,
      skills: combinedSkills,
    });

    setLinkedinDialogOpen(false);
    setLinkedinImportData({ headline: '', summary: '', skills: '', experience: '' });
    
    toast({
      title: 'LinkedIn data imported',
      description: 'Your profile has been updated with LinkedIn info. Remember to save!',
    });
  };

  const handleLinkedinScrape = async () => {
    if (!linkedinUrlToScrape.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter your LinkedIn profile URL',
        variant: 'destructive',
      });
      return;
    }

    if (!linkedinUrlToScrape.includes('linkedin.com/in/')) {
      toast({
        title: 'Invalid LinkedIn URL',
        description: 'Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/yourname)',
        variant: 'destructive',
      });
      return;
    }

    setIsScraping(true);

    try {
      const response = await firecrawlApi.scrape(linkedinUrlToScrape, {
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 5000,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to scrape LinkedIn profile');
      }

      const markdown = response.data?.markdown || response.data?.data?.markdown || '';
      
      if (!markdown || markdown.length < 100) {
        toast({
          title: 'Limited data retrieved',
          description: 'LinkedIn blocks most scraping attempts. Try the manual import instead.',
          variant: 'destructive',
        });
        setScrapeDialogOpen(false);
        setLinkedinDialogOpen(true);
        return;
      }

      const lines = markdown.split('\n').filter((l: string) => l.trim());
      const nameMatch = markdown.match(/^#\s*(.+)$/m) || markdown.match(/^(.+?)\s*[-|]/m);
      const extractedName = nameMatch ? nameMatch[1].trim() : '';
      const headlineMatch = markdown.match(/(?:^|\n)([A-Z][^.\n]{10,100})(?:\n|$)/);
      const extractedHeadline = headlineMatch ? headlineMatch[1].trim() : '';
      const skillsMatch = markdown.match(/skills?:?\s*([^\n]+)/i);
      const extractedSkills = skillsMatch ? skillsMatch[1].trim() : '';

      if (extractedName) {
        setFormData(prev => ({ ...prev, full_name: extractedName }));
      }
      
      setLinkedinImportData({
        headline: extractedHeadline,
        summary: markdown.slice(0, 1500),
        skills: extractedSkills,
        experience: '',
      });

      setScrapeDialogOpen(false);
      setLinkedinDialogOpen(true);

      toast({
        title: 'Data scraped!',
        description: 'Review the extracted data below and edit as needed before importing.',
      });
    } catch (error) {
      console.error('Scrape error:', error);
      toast({
        title: 'Scraping failed',
        description: error instanceof Error ? error.message : 'LinkedIn blocks automated access. Try manual import.',
        variant: 'destructive',
      });
    } finally {
      setIsScraping(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData({ ...formData, interests: [...formData.interests, newInterest.trim()] });
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData({ ...formData, interests: formData.interests.filter((i) => i !== interest) });
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
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

      {/* Verification Status */}
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
                  <p className="font-medium text-emerald-700">Verified Member</p>
                  <p className="text-sm text-muted-foreground">You have full access to all features</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-700">Pending Verification</p>
                  <p className="text-sm text-muted-foreground">
                    Complete your profile with university details to get verified
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* LinkedIn Import Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card className="border-[#0A66C2]/20 bg-[#0A66C2]/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0A66C2]">
                <Linkedin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Import from LinkedIn</p>
                <p className="text-sm text-muted-foreground">
                  Quickly populate your profile with your LinkedIn information
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Auto Scrape Dialog */}
              <Dialog open={scrapeDialogOpen} onOpenChange={setScrapeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="gap-2 bg-[#0A66C2] hover:bg-[#004182] flex-1 sm:flex-none">
                    <Wand2 className="w-4 h-4" />
                    Auto Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Wand2 className="w-5 h-5 text-[#0A66C2]" />
                      Quick Import from LinkedIn
                    </DialogTitle>
                    <DialogDescription>
                      We'll extract your name, headline, and skills from your public profile.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkedin-url-scrape">Your LinkedIn URL</Label>
                      <Input
                        id="linkedin-url-scrape"
                        value={linkedinUrlToScrape}
                        onChange={(e) => setLinkedinUrlToScrape(e.target.value)}
                        placeholder="linkedin.com/in/yourname"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste your full LinkedIn profile URL
                      </p>
                    </div>
                    
                    {!isScraping && (
                      <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                        <p className="font-medium text-muted-foreground">What we'll import:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          <li>Full name</li>
                          <li>Professional headline</li>
                          <li>Skills (if public)</li>
                        </ul>
                      </div>
                    )}
                    
                    {isScraping && (
                      <div className="flex items-center justify-center gap-3 p-4">
                        <Loader2 className="w-5 h-5 animate-spin text-[#0A66C2]" />
                        <span className="text-sm">Fetching your profile...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setScrapeDialogOpen(false)} disabled={isScraping}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleLinkedinScrape} 
                      disabled={isScraping || !linkedinUrlToScrape.trim()}
                      className="gap-2 bg-[#0A66C2] hover:bg-[#004182]"
                    >
                      {isScraping ? 'Importing...' : 'Import Profile'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Manual Import Dialog */}
              <Dialog open={linkedinDialogOpen} onOpenChange={setLinkedinDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
                    <Upload className="w-4 h-4" />
                    Manual
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                    Import from LinkedIn
                  </DialogTitle>
                  <DialogDescription>
                    Copy information from your LinkedIn profile and paste it below. This helps build your startup resume.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <span>Open your <a href="https://www.linkedin.com/in/" target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] underline">LinkedIn profile</a> in a new tab to copy your info</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="linkedin-headline">Headline</Label>
                    <Input
                      id="linkedin-headline"
                      value={linkedinImportData.headline}
                      onChange={(e) => setLinkedinImportData({ ...linkedinImportData, headline: e.target.value })}
                      placeholder="e.g., Computer Science Student | Aspiring Entrepreneur"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="linkedin-summary">About / Summary</Label>
                    <Textarea
                      id="linkedin-summary"
                      value={linkedinImportData.summary}
                      onChange={(e) => setLinkedinImportData({ ...linkedinImportData, summary: e.target.value })}
                      placeholder="Paste your LinkedIn summary here..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="linkedin-experience">Experience (optional)</Label>
                    <Textarea
                      id="linkedin-experience"
                      value={linkedinImportData.experience}
                      onChange={(e) => setLinkedinImportData({ ...linkedinImportData, experience: e.target.value })}
                      placeholder="Paste your key experience or roles..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="linkedin-skills">Skills (comma-separated)</Label>
                    <Input
                      id="linkedin-skills"
                      value={linkedinImportData.skills}
                      onChange={(e) => setLinkedinImportData({ ...linkedinImportData, skills: e.target.value })}
                      placeholder="e.g., Python, React, Machine Learning, Product Management"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setLinkedinDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleLinkedinImport} className="gap-2 bg-[#0A66C2] hover:bg-[#004182]">
                    <Upload className="w-4 h-4" />
                    Import to Profile
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {getInitials(formData.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your public profile details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio / Summary</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself, your experience, and what you're looking for..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">This will be displayed on your public profile and acts as your professional summary.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Select
                  value={formData.university_id}
                  onValueChange={(value) => setFormData({ ...formData, university_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select university" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((uni) => (
                      <SelectItem key={uni.id} value={uni.id}>
                        {uni.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Major</Label>
                <Input
                  id="major"
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="graduation_year">Graduation Year</Label>
                <Input
                  id="graduation_year"
                  type="number"
                  value={formData.graduation_year}
                  onChange={(e) => setFormData({ ...formData, graduation_year: e.target.value })}
                  placeholder="2025"
                  min="2020"
                  max="2030"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Select
                  value={formData.availability}
                  onValueChange={(value) => setFormData({ ...formData, availability: value })}
                >
                  <SelectTrigger>
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

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    {skill}
                    <button onClick={() => removeSkill(skill)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addSkill}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <Label>Interests</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.interests.map((interest) => (
                  <Badge key={interest} variant="outline" className="gap-1">
                    {interest}
                    <button onClick={() => removeInterest(interest)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add an interest..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addInterest}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <Label className="text-base">Links</Label>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="linkedin_url" className="text-sm text-muted-foreground">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="github_url" className="text-sm text-muted-foreground">GitHub</Label>
                  <Input
                    id="github_url"
                    value={formData.github_url}
                    onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="portfolio_url" className="text-sm text-muted-foreground">Portfolio</Label>
                  <Input
                    id="portfolio_url"
                    value={formData.portfolio_url}
                    onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                'Saving...'
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
    </div>
  );
}
