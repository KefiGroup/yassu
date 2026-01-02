import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Check, Sparkles, AlertCircle, Copy } from 'lucide-react';
import { api } from '@/lib/api';

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
  const [linkedinContent, setLinkedinContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedBio, setGeneratedBio] = useState<GeneratedBio | null>(null);
  const [selectedBioType, setSelectedBioType] = useState<'short' | 'long'>('short');
  const [error, setError] = useState<string | null>(null);

  const processLinkedInContent = useCallback(async (content: string) => {
    if (!content || content.trim().length < 50) {
      toast({
        title: 'Not enough content',
        description: 'Please paste more content from your LinkedIn profile (at least 50 characters)',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedBio(null);

    try {
      const data = await api.functions.importLinkedin(content);
      setGeneratedBio(data);
    } catch (error) {
      console.error('LinkedIn import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate bio';
      setError(errorMessage);
      toast({
        title: 'Import failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleGenerate = useCallback(() => {
    processLinkedInContent(linkedinContent);
  }, [linkedinContent, processLinkedInContent]);

  const handleRegenerate = useCallback(() => {
    processLinkedInContent(linkedinContent);
  }, [linkedinContent, processLinkedInContent]);

  const handleApply = useCallback(() => {
    if (!generatedBio) return;

    const bioToApply = selectedBioType === 'short' ? generatedBio.shortBio : generatedBio.longBio;
    
    let finalBio = bioToApply;
    if (generatedBio.highlights.length > 0) {
      finalBio += '\n\n' + generatedBio.highlights.map(h => `- ${h}`).join('\n');
    }

    onApply(finalBio, generatedBio.skills);
    
    toast({
      title: 'Bio applied',
      description: 'Your profile has been updated with the generated bio.',
    });

    setGeneratedBio(null);
    setLinkedinContent('');
    setError(null);
    onOpenChange(false);
  }, [generatedBio, selectedBioType, onApply, onOpenChange, toast]);

  const handleClose = useCallback(() => {
    setGeneratedBio(null);
    setLinkedinContent('');
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const canGenerate = linkedinContent.trim().length >= 50;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Import from LinkedIn
          </DialogTitle>
          <DialogDescription>
            Paste your LinkedIn profile content to generate a professional bio
          </DialogDescription>
        </DialogHeader>

        {!generatedBio ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="linkedin-content">LinkedIn Profile Content</Label>
              <Textarea
                id="linkedin-content"
                placeholder="Go to your LinkedIn profile, select all text (Ctrl+A / Cmd+A), copy it (Ctrl+C / Cmd+C), and paste it here..."
                value={linkedinContent}
                onChange={(e) => setLinkedinContent(e.target.value)}
                rows={8}
                disabled={isLoading}
                className="resize-none"
                data-testid="input-linkedin-content"
              />
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  How to copy your LinkedIn profile:
                </h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to your LinkedIn profile page</li>
                  <li>Press Ctrl+A (Windows) or Cmd+A (Mac) to select all</li>
                  <li>Press Ctrl+C (Windows) or Cmd+C (Mac) to copy</li>
                  <li>Paste the content in the box above</li>
                </ol>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm text-destructive">
                  <p className="font-medium">Import failed</p>
                  <p className="text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <div>
                    <p className="font-medium text-sm">Generating your bio with AI...</p>
                    <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate || isLoading} data-testid="button-generate-bio">
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
                  data-testid="button-select-short-bio"
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
                  data-testid="button-select-long-bio"
                >
                  <div className="font-medium mb-1">Long Bio</div>
                  <div className="text-xs text-muted-foreground">Max 1200 characters</div>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Bio Preview</Label>
              <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap" data-testid="text-bio-preview">
                {selectedBioType === 'short' ? generatedBio.shortBio : generatedBio.longBio}
              </div>
            </div>

            {generatedBio.highlights.length > 0 && (
              <div className="space-y-3">
                <Label>Highlights (will be appended)</Label>
                <ul className="space-y-1 text-sm">
                  {generatedBio.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary">-</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

            <div className="flex justify-between gap-3 pt-4 border-t flex-wrap">
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
                <Button onClick={handleApply} data-testid="button-apply-bio">
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
