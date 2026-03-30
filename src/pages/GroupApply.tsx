import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Upload, FileText, X } from 'lucide-react';

interface GroupPublicInfo {
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  applicationQuestions: { label: string; type: 'text' | 'textarea' | 'file'; required: boolean }[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const ALLOWED_EXTENSIONS = '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp';

export default function GroupApply() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [groupInfo, setGroupInfo] = useState<GroupPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [fileNames, setFileNames] = useState<Record<number, string>>({});

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);

  const uploadFile = async (file: File, questionIdx: number) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB', variant: 'destructive' });
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({ title: 'Unsupported file type', description: 'Please upload PDF, DOC, DOCX, PPT, PPTX, JPG, PNG, or WEBP files', variant: 'destructive' });
      return;
    }

    try {
      setUploadingIdx(questionIdx);
      const urlRes = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error('Failed to get upload URL');
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Failed to upload file');

      setAnswers(prev => prev.map((a, idx) => idx === questionIdx ? { ...a, answer: `[file:${file.name}]${objectPath}` } : a));
      setFileNames(prev => ({ ...prev, [questionIdx]: file.name }));
      toast({ title: 'File uploaded successfully' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingIdx(null);
    }
  };

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`/api/groups/${slug}/public-info`);
        if (!res.ok) throw new Error('Group not found');
        const data = await res.json();
        setGroupInfo(data);
        setAnswers((data.applicationQuestions || []).map((q: any) => ({ question: q.label, answer: '' })));
        document.title = `Apply to ${data.name} | Yassu`;
      } catch {
        toast({ title: 'Group not found', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchGroup();
  }, [slug, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const questions = groupInfo?.applicationQuestions || [];
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].required && !answers[i]?.answer?.trim()) {
        toast({ title: `Please answer: "${questions[i].label}"`, variant: 'destructive' });
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/groups/${slug}/public-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSubmitted(true);
      setIsNewUser(data.isNewUser);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const primaryHSL = groupInfo?.primaryColor || '250 60% 65%';
  const accentHSL = groupInfo?.accentColor || '15 80% 75%';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Group not found.</p>
            <Button className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `hsl(${primaryHSL} / 0.15)` }}>
              <CheckCircle className="h-8 w-8" style={{ color: `hsl(${primaryHSL})` }} />
            </div>
            <h2 className="text-2xl font-bold">Application Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you for applying to <strong>{groupInfo.name}</strong>. Your application is under review.
            </p>
            {isNewUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                A Yassu account has been created for you. Check your email for login credentials.
              </div>
            )}
            <Button onClick={() => navigate('/auth')} style={{ backgroundColor: `hsl(${primaryHSL})` }} className="text-white">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full py-8 px-4" style={{ background: `linear-gradient(135deg, hsl(${primaryHSL}), hsl(${primaryHSL} / 0.8))` }}>
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-3">
          {groupInfo.logoUrl && (
            <img src={groupInfo.logoUrl} alt={groupInfo.name} className="h-16 rounded-xl object-contain bg-white/20 p-2" style={{ width: 'auto', maxWidth: '200px' }} data-testid="img-group-logo" />
          )}
          <div className="text-white">
            <h1 className="text-2xl font-bold">{groupInfo.name}</h1>
            {groupInfo.description && <p className="text-sm opacity-90 mt-1">{groupInfo.description}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
            <CardDescription>Fill out the form below to apply. All fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" required data-testid="input-first-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" required data-testid="input-last-name" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" required data-testid="input-email" />
              </div>

              {(groupInfo.applicationQuestions || []).map((q, i) => (
                <div key={i} className="space-y-2">
                  <Label>{q.label} {q.required && '*'}</Label>
                  {q.type === 'file' ? (
                    <div className="space-y-2">
                      {answers[i]?.answer ? (
                        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate flex-1">{fileNames[i] || 'File uploaded'}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: '' } : a));
                              setFileNames(prev => { const next = { ...prev }; delete next[i]; return next; });
                            }}
                            data-testid={`button-remove-file-${i}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label
                          className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                          data-testid={`input-file-${i}`}
                        >
                          {uploadingIdx === i ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          ) : (
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          )}
                          <span className="text-sm text-muted-foreground mt-2">
                            {uploadingIdx === i ? 'Uploading...' : 'Click to upload a file'}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            PDF, DOC, DOCX, PPT, PPTX, JPG, PNG (max 10MB)
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept={ALLOWED_EXTENSIONS}
                            disabled={uploadingIdx !== null}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) uploadFile(file, i);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ) : q.type === 'textarea' ? (
                    <Textarea
                      value={answers[i]?.answer || ''}
                      onChange={e => setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a))}
                      placeholder="Your answer..."
                      rows={4}
                      required={q.required}
                      data-testid={`input-question-${i}`}
                    />
                  ) : (
                    <Input
                      value={answers[i]?.answer || ''}
                      onChange={e => setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a))}
                      placeholder="Your answer..."
                      required={q.required}
                      data-testid={`input-question-${i}`}
                    />
                  )}
                </div>
              ))}

              <Button
                type="submit"
                className="w-full text-white"
                disabled={submitting}
                style={{ backgroundColor: `hsl(${primaryHSL})` }}
                data-testid="button-submit-application"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Application
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center py-6">
          <a href="https://yassu.ai" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-powered-by">
            Powered by <span className="font-semibold">Yassu</span>
          </a>
        </div>
      </div>
    </div>
  );
}
