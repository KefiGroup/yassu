import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Upload, FileText, X, UserPlus, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface GroupPublicInfo {
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  applicationQuestions: { label: string; type: 'text' | 'textarea' | 'file'; required: boolean }[];
  redirectUrl: string | null;
  submissionMessage: string | null;
  submissionFileUrl: string | null;
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
  const [universityName, setUniversityName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [major, setMajor] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [teamEmailInput, setTeamEmailInput] = useState('');
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
        body: JSON.stringify({ firstName, lastName, email, universityName, graduationYear, major, answers, projectTitle, teamEmails }),
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
    const isImage = groupInfo.submissionFileUrl && /\.(jpg|jpeg|png|webp)$/i.test(groupInfo.submissionFileUrl);
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 pt-24">
          <Card className="max-w-lg w-full">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `hsl(${primaryHSL} / 0.15)` }}>
                <CheckCircle className="h-8 w-8" style={{ color: `hsl(${primaryHSL})` }} />
              </div>
              <h2 className="text-2xl font-bold">Application Saved!</h2>
              <p className="text-muted-foreground">
                {groupInfo.submissionMessage || <>Thank you for applying to <strong>{groupInfo.name}</strong>. Log in to review your answers and submit your application when you're ready.</>}
              </p>
              {isNewUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  A Yassu account has been created for you. Check your email for login credentials, then log in to review and submit your application.
                </div>
              )}
              {!isNewUser && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                  Your application has been saved as a draft. Log in to review and submit it.
                </div>
              )}
              {groupInfo.submissionFileUrl && (
                isImage ? (
                  <img src={groupInfo.submissionFileUrl} alt="Welcome" className="rounded-lg mx-auto max-h-64 object-contain" data-testid="img-submission-file" />
                ) : (
                  <a href={groupInfo.submissionFileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm underline" style={{ color: `hsl(${primaryHSL})` }} data-testid="link-submission-file">
                    <FileText className="w-4 h-4" />
                    View attached document
                  </a>
                )
              )}
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                {groupInfo.redirectUrl && (
                  <Button onClick={() => window.location.href = groupInfo!.redirectUrl!} style={{ backgroundColor: `hsl(${primaryHSL})` }} className="text-white" data-testid="button-redirect">
                    Continue to {groupInfo.name}
                  </Button>
                )}
                <Button onClick={() => window.location.href = '/auth'} variant={groupInfo.redirectUrl ? 'outline' : 'default'} style={!groupInfo.redirectUrl ? { backgroundColor: `hsl(${primaryHSL})` } : {}} className={!groupInfo.redirectUrl ? 'text-white' : ''} data-testid="button-go-login">
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="w-full py-8 px-4 mt-20" style={{ background: `linear-gradient(135deg, hsl(${primaryHSL}), hsl(${primaryHSL} / 0.8))` }}>
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-3">
          {groupInfo.logoUrl && (
            <img src={groupInfo.logoUrl} alt={groupInfo.name} className="h-14 object-contain" style={{ width: 'auto', maxWidth: '240px' }} data-testid="img-group-logo" />
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

              <div className="space-y-2">
                <Label htmlFor="universityName">University Name *</Label>
                <Input id="universityName" value={universityName} onChange={e => setUniversityName(e.target.value)} placeholder="e.g. UCLA" required data-testid="input-university-name" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="graduationYear">Year of Graduation *</Label>
                  <Input id="graduationYear" value={graduationYear} onChange={e => setGraduationYear(e.target.value)} placeholder="e.g. 2026" required data-testid="input-graduation-year" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major">Major *</Label>
                  <Input id="major" value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Computer Science" required data-testid="input-major" />
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="space-y-2">
                  <Label htmlFor="projectTitle">Project Title</Label>
                  <Input id="projectTitle" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="Enter your project or startup name" data-testid="input-project-title" />
                </div>
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

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Invite Team Members
                </Label>
                <p className="text-sm text-muted-foreground">
                  Add email addresses of team members. They'll be automatically added to the group when they create an account.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={teamEmailInput}
                    onChange={e => setTeamEmailInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = teamEmailInput.trim().toLowerCase();
                        if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !teamEmails.includes(trimmed)) {
                          setTeamEmails(prev => [...prev, trimmed]);
                          setTeamEmailInput('');
                        }
                      }
                    }}
                    placeholder="teammate@university.edu"
                    data-testid="input-team-email"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const trimmed = teamEmailInput.trim().toLowerCase();
                      if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !teamEmails.includes(trimmed)) {
                        setTeamEmails(prev => [...prev, trimmed]);
                        setTeamEmailInput('');
                      }
                    }}
                    data-testid="button-add-team-email"
                  >
                    Add
                  </Button>
                </div>
                {teamEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {teamEmails.map((em, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                        <Mail className="w-3 h-3" />
                        {em}
                        <button
                          type="button"
                          onClick={() => setTeamEmails(prev => prev.filter((_, i) => i !== idx))}
                          className="ml-1 hover:text-destructive"
                          data-testid={`button-remove-team-email-${idx}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

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

      </div>
      <Footer />
    </div>
  );
}
