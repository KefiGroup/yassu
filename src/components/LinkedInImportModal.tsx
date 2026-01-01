import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, ClipboardPaste, RefreshCw, Check, FileText, Sparkles } from 'lucide-react';

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
  const [pastedContent, setPastedContent] = useState('');
  const [uploadedContent, setUploadedContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedBio, setGeneratedBio] = useState<GeneratedBio | null>(null);
  const [selectedBioType, setSelectedBioType] = useState<'short' | 'long'>('short');
  const [activeTab, setActiveTab] = useState('paste');

  const processContent = useCallback(async (content: string) => {
    if (content.trim().length < 50) {
      toast({
        title: 'Not enough content',
        description: 'Please provide more LinkedIn content (at least 50 characters)',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedBio(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-linkedin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ linkedinContent: content }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate bio');
      }

      setGeneratedBio(data);
    } catch (error) {
      console.error('LinkedIn import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to process LinkedIn content',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['.zip', '.csv', '.json', '.pdf', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: 'Unsupported file type',
        description: 'Please upload a .zip, .csv, .json, .pdf, or .txt file',
        variant: 'destructive',
      });
      return;
    }

    setUploadedFileName(file.name);

    // For text-based files, read content directly
    if (['.txt', '.csv', '.json'].includes(fileExtension)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setUploadedContent(content);
      };
      reader.readAsText(file);
    } else {
      // For zip/pdf, we'd need server-side processing
      // For now, show a message to use paste instead
      toast({
        title: 'File uploaded',
        description: 'For best results with ZIP/PDF files, please copy and paste the text content directly.',
      });
      setUploadedContent('');
    }

    event.target.value = '';
  }, [toast]);

  const handleGenerate = useCallback(() => {
    const content = activeTab === 'paste' ? pastedContent : uploadedContent;
    processContent(content);
  }, [activeTab, pastedContent, uploadedContent, processContent]);

  const handleRegenerate = useCallback(() => {
    const content = activeTab === 'paste' ? pastedContent : uploadedContent;
    processContent(content);
  }, [activeTab, pastedContent, uploadedContent, processContent]);

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
    setPastedContent('');
    setUploadedContent('');
    setUploadedFileName('');
    onOpenChange(false);
  }, [generatedBio, selectedBioType, onApply, onOpenChange, toast]);

  const handleClose = useCallback(() => {
    setGeneratedBio(null);
    setPastedContent('');
    setUploadedContent('');
    setUploadedFileName('');
    onOpenChange(false);
  }, [onOpenChange]);

  const currentContent = activeTab === 'paste' ? pastedContent : uploadedContent;
  const canGenerate = currentContent.trim().length >= 50;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Import from LinkedIn
          </DialogTitle>
          <DialogDescription>
            Generate a professional bio from your LinkedIn profile
          </DialogDescription>
        </DialogHeader>

        {!generatedBio ? (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste" className="flex items-center gap-2">
                  <ClipboardPaste className="w-4 h-4" />
                  Paste Content
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Export
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-4 mt-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
                  <p className="font-medium">How to copy from LinkedIn:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to your LinkedIn profile</li>
                    <li>Copy your <strong>About</strong> section</li>
                    <li>Copy your <strong>Experience</strong> (role titles + descriptions)</li>
                    <li>Paste everything below</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin-paste">Your LinkedIn Content</Label>
                  <Textarea
                    id="linkedin-paste"
                    placeholder="Paste your LinkedIn About section and Experience here..."
                    value={pastedContent}
                    onChange={(e) => setPastedContent(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {pastedContent.length} characters {pastedContent.length < 50 && '(minimum 50)'}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
                  <p className="font-medium">Upload your LinkedIn export:</p>
                  <p className="text-muted-foreground">
                    You can request your data from LinkedIn Settings → Get a copy of your data.
                    Supported formats: .zip, .csv, .json, .pdf, .txt
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin-upload">Upload File</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="linkedin-upload"
                      type="file"
                      accept=".zip,.csv,.json,.pdf,.txt"
                      onChange={handleFileUpload}
                      className="flex-1"
                    />
                  </div>
                  {uploadedFileName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      {uploadedFileName}
                      {uploadedContent && <span className="text-emerald-600">✓ Content extracted</span>}
                    </div>
                  )}
                </div>
                {uploadedContent && (
                  <div className="space-y-2">
                    <Label>Extracted Content</Label>
                    <Textarea
                      value={uploadedContent}
                      onChange={(e) => setUploadedContent(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {uploadedContent.length} characters
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Bio
                  </>
                )}
              </Button>
            </div>
          </>
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
