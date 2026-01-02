import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Check, Sparkles, Link2, AlertCircle } from 'lucide-react';

interface GeneratedBio {
  shortBio: string;
  longBio: string;
  highlights: string[];
  skills: string[];
}

interface LinkedInImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (bio: string, skills: string[]) => void;
}

export function LinkedInImportModal({ open, onOpenChange, onApply }: LinkedInImportModalProps) {
  const { toast } = useToast();
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'scraping' | 'generating' | null>(null);
  const [generatedBio, setGeneratedBio] = useState<GeneratedBio | null>(null);
  const [selectedBioType, setSelectedBioType] = useState<'short' | 'long'>('short');
  const [error, setError] = useState<string | null>(null);

  const isValidLinkedInUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return false;
    // Accept linkedin.com/in/ URLs
    return trimmed.includes('linkedin.com/in/');
  };

  const processLinkedInUrl = useCallback(async (url: string) => {
    if (!isValidLinkedInUrl(url)) {
      toast({
        title: 'Invalid LinkedIn URL',
        description: 'Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/yourname)',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedBio(null);

    try {
      // Step 1: Scrape LinkedIn profile using Firecrawl
      setLoadingStep('scraping');
      
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const scrapeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firecrawl-scrape`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            url: formattedUrl,
            options: {
              formats: ['markdown'],
              onlyMainContent: true,
              waitFor: 5000,
            }
          }),
        }
      );

      const scrapeData = await scrapeResponse.json();

      if (!scrapeResponse.ok || !scrapeData.success) {
        throw new Error(scrapeData.error || 'Failed to fetch LinkedIn profile. The profile may be private or LinkedIn may be blocking the request.');
      }

      const scrapedContent = scrapeData.data?.markdown || scrapeData.data?.content;
      
      if (!scrapedContent || scrapedContent.length < 50) {
        throw new Error('Could not extract enough content from the LinkedIn profile. Please ensure the profile is public.');
      }

      // Step 2: Send to OpenAI for bio generation
      setLoadingStep('generating');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-linkedin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ linkedinContent: scrapedContent }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate bio');
      }

      setGeneratedBio(data);
    } catch (error) {
      console.error('LinkedIn import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import LinkedIn profile';
      setError(errorMessage);
      toast({
        title: 'Import failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  }, [toast]);

  const handleGenerate = useCallback(() => {
    processLinkedInUrl(linkedinUrl);
  }, [linkedinUrl, processLinkedInUrl]);

  const handleRegenerate = useCallback(() => {
    processLinkedInUrl(linkedinUrl);
  }, [linkedinUrl, processLinkedInUrl]);

  const handleApply = useCallback(() => {
    if (!generatedBio) return;

    const bioToApply = selectedBioType === 'short' ? generatedBio.shortBio : generatedBio.longBio;
    
    // Combine highlights into bio if present
    let finalBio = bioToApply;
    if (generatedBio.highlights.length > 0) {
      finalBio += '\n\n' + generatedBio.highlights.map(h => `• ${h}`).join('\n');
    }

    onApply(finalBio, generatedBio.skills);
    
    toast({
      title: 'Bio applied',
      description: 'Your profile has been updated with the generated bio.',
    });

    // Reset and close
    setGeneratedBio(null);
    setLinkedinUrl('');
    setError(null);
    onOpenChange(false);
  }, [generatedBio, selectedBioType, onApply, onOpenChange, toast]);

  const handleClose = useCallback(() => {
    setGeneratedBio(null);
    setLinkedinUrl('');
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const canGenerate = isValidLinkedInUrl(linkedinUrl);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Import from LinkedIn
          </DialogTitle>
          <DialogDescription>
            Enter your LinkedIn profile URL to automatically generate a professional bio
          </DialogDescription>
        </DialogHeader>

        {!generatedBio ? (
          <div className="space-y-6">
            {/* URL Input */}
            <div className="space-y-3">
              <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="linkedin-url"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Paste your full LinkedIn profile URL. Make sure your profile is set to public.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm text-destructive">
                  <p className="font-medium">Import failed</p>
                  <p className="text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <div>
                    <p className="font-medium text-sm">
                      {loadingStep === 'scraping' 
                        ? 'Fetching your LinkedIn profile...' 
                        : 'Generating your bio with AI...'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {loadingStep === 'scraping'
                        ? 'This may take a few seconds'
                        : 'Almost there!'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Bio
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bio Type Selection */}
            <div className="space-y-3">
              <Label>Select Bio Version</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedBioType('short')}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedBioType === 'short'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium mb-1">Short Bio</div>
                  <div className="text-xs text-muted-foreground">Max 600 characters</div>
                </button>
                <button
                  onClick={() => setSelectedBioType('long')}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedBioType === 'long'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium mb-1">Long Bio</div>
                  <div className="text-xs text-muted-foreground">Max 1200 characters</div>
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <Label>Bio Preview</Label>
              <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                {selectedBioType === 'short' ? generatedBio.shortBio : generatedBio.longBio}
              </div>
            </div>

            {/* Highlights */}
            {generatedBio.highlights.length > 0 && (
              <div className="space-y-3">
                <Label>Highlights (will be appended)</Label>
                <ul className="space-y-1 text-sm">
                  {generatedBio.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {generatedBio.skills.length > 0 && (
              <div className="space-y-3">
                <Label>Skills to Add</Label>
                <div className="flex flex-wrap gap-2">
                  {generatedBio.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleRegenerate} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Regenerate
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleApply}>
                  <Check className="w-4 h-4 mr-2" />
                  Apply to Profile
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
