import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Linkedin, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LinkedInData {
  fullName: string;
  headline: string;
  bio: string;
  location: string;
  profilePicture: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    startYear: number;
    endYear: string | number;
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    startYear: number;
    endYear: number;
  }>;
}

interface LinkedInImportProps {
  linkedinUrl: string;
  onLinkedInUrlChange: (url: string) => void;
  onDataImported: (data: Partial<LinkedInData>) => void;
}

export function LinkedInImport({ linkedinUrl, onLinkedInUrlChange, onDataImported }: LinkedInImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importedData, setImportedData] = useState<LinkedInData | null>(null);
  const [selectedFields, setSelectedFields] = useState({
    fullName: true,
    headline: true,
    bio: true,
    skills: true,
  });
  const { toast } = useToast();

  const handleImport = async () => {
    if (!linkedinUrl) {
      toast({
        title: 'LinkedIn URL required',
        description: 'Please enter your LinkedIn profile URL first.',
        variant: 'destructive',
      });
      return;
    }

    // Validate LinkedIn URL format
    const linkedinPattern = /linkedin\.com\/in\/[^\/\?]+/;
    if (!linkedinPattern.test(linkedinUrl)) {
      toast({
        title: 'Invalid LinkedIn URL',
        description: 'Please enter a valid LinkedIn profile URL (e.g., https://www.linkedin.com/in/yourname)',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch('/api/linkedin/import-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linkedinUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to import LinkedIn profile');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setImportedData(result.data);
        setShowPreview(true);
        toast({
          title: 'Profile data fetched!',
          description: 'Review the imported data and select what to apply.',
        });
      } else {
        throw new Error(result.error || 'Failed to import profile');
      }
    } catch (error) {
      console.error('LinkedIn import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import LinkedIn profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleApplyData = () => {
    if (!importedData) return;

    const dataToApply: Partial<LinkedInData> = {};

    if (selectedFields.fullName && importedData.fullName) {
      dataToApply.fullName = importedData.fullName;
    }
    if (selectedFields.bio && importedData.bio) {
      dataToApply.bio = importedData.bio;
    }
    if (selectedFields.skills && importedData.skills) {
      dataToApply.skills = importedData.skills;
    }

    onDataImported(dataToApply);
    setShowPreview(false);
    
    toast({
      title: 'Profile updated!',
      description: 'LinkedIn data has been imported successfully.',
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            LinkedIn Profile URL
          </Label>
          <div className="flex gap-2">
            <Input
              id="linkedinUrl"
              type="url"
              placeholder="https://www.linkedin.com/in/your-username"
              value={linkedinUrl}
              onChange={(e) => onLinkedInUrlChange(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleImport}
              disabled={isImporting || !linkedinUrl}
              className="bg-[#0A66C2] hover:bg-[#004182] text-white"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Linkedin className="w-4 h-4 mr-2" />
                  Import from LinkedIn
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Import your profile information directly from LinkedIn to save time
          </p>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              LinkedIn Data Imported
            </DialogTitle>
            <DialogDescription>
              Review the imported data and select which fields you want to apply to your profile.
            </DialogDescription>
          </DialogHeader>

          {importedData && (
            <div className="space-y-4 py-4">
              {/* Full Name */}
              {importedData.fullName && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="import-fullName"
                        checked={selectedFields.fullName}
                        onCheckedChange={(checked) =>
                          setSelectedFields({ ...selectedFields, fullName: !!checked })
                        }
                      />
                      <div className="flex-1">
                        <Label htmlFor="import-fullName" className="font-semibold cursor-pointer">
                          Full Name
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">{importedData.fullName}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Headline */}
              {importedData.headline && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="import-headline"
                        checked={selectedFields.headline}
                        onCheckedChange={(checked) =>
                          setSelectedFields({ ...selectedFields, headline: !!checked })
                        }
                      />
                      <div className="flex-1">
                        <Label htmlFor="import-headline" className="font-semibold cursor-pointer">
                          Headline
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">{importedData.headline}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bio/Summary */}
              {importedData.bio && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="import-bio"
                        checked={selectedFields.bio}
                        onCheckedChange={(checked) =>
                          setSelectedFields({ ...selectedFields, bio: !!checked })
                        }
                      />
                      <div className="flex-1">
                        <Label htmlFor="import-bio" className="font-semibold cursor-pointer">
                          Bio / Summary
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {importedData.bio.length > 200
                            ? `${importedData.bio.substring(0, 200)}...`
                            : importedData.bio}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {importedData.skills && importedData.skills.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="import-skills"
                        checked={selectedFields.skills}
                        onCheckedChange={(checked) =>
                          setSelectedFields({ ...selectedFields, skills: !!checked })
                        }
                      />
                      <div className="flex-1">
                        <Label htmlFor="import-skills" className="font-semibold cursor-pointer">
                          Skills ({importedData.skills.length})
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {importedData.skills.slice(0, 10).map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                          {importedData.skills.length > 10 && (
                            <Badge variant="outline">+{importedData.skills.length - 10} more</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experience */}
              {importedData.experience && importedData.experience.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Label className="font-semibold">Experience (for reference)</Label>
                      {importedData.experience.slice(0, 3).map((exp, index) => (
                        <div key={index} className="text-sm border-l-2 border-primary pl-3">
                          <p className="font-medium">{exp.title}</p>
                          <p className="text-muted-foreground">{exp.company}</p>
                          <p className="text-xs text-muted-foreground">
                            {exp.startYear} - {exp.endYear}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {importedData.education && importedData.education.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Label className="font-semibold">Education (for reference)</Label>
                      {importedData.education.slice(0, 2).map((edu, index) => (
                        <div key={index} className="text-sm border-l-2 border-primary pl-3">
                          <p className="font-medium">{edu.school}</p>
                          <p className="text-muted-foreground">
                            {edu.degree} {edu.field && `in ${edu.field}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {edu.startYear} - {edu.endYear}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyData} className="bg-[#0A66C2] hover:bg-[#004182]">
              Apply Selected Fields
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
