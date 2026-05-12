import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
  applicationQuestions: { label: string; type: 'text' | 'textarea' | 'file' | 'radio' | 'checkbox' | 'dropdown' | 'number' | 'date' | 'url'; required: boolean; options?: string[] }[];
  redirectUrl: string | null;
  submissionMessage: string | null;
  submissionFileUrl: string | null;
  applicationDeadline?: string | null;
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
  const { user, profile, loading: authLoading } = useAuth();
  const isLoggedIn = !!user && !authLoading;

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
  const [teamInfo, setTeamInfo] = useState('');
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
        // Error state is rendered inline below; no toast needed.
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchGroup();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        toast({ title: 'Please fill in all required fields', variant: 'destructive' });
        return;
      }
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

      if (isLoggedIn) {
        const res = await fetch(`/api/groups/${slug}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ answers, projectTitle, teamEmails: teamInfo.trim() ? [teamInfo.trim()] : [] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit');
        toast({ title: 'Application submitted!', description: 'Your application has been submitted successfully.' });
        navigate('/portal/dashboard');
      } else {
        const res = await fetch(`/api/groups/${slug}/public-apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, universityName, graduationYear, major, answers, projectTitle, teamEmails: teamInfo.trim() ? [teamInfo.trim()] : [] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit');
        setSubmitted(true);
        setIsNewUser(data.isNewUser);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const primaryHSL = groupInfo?.primaryColor || '250 60% 65%';
  const accentHSL = groupInfo?.accentColor || '15 80% 75%';

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 pt-24">
          <Card className="max-w-md w-full" data-testid="card-group-not-found">
            <CardHeader className="text-center">
              <CardTitle>Group not found</CardTitle>
              <CardDescription>
                {slug ? (
                  <>
                    We couldn't find a group with the link{' '}
                    <span className="font-mono text-foreground break-all" data-testid="text-attempted-slug">
                      {typeof window !== 'undefined' ? window.location.pathname : `/apply/${slug}`}
                    </span>
                    . Double-check the URL — it may have a typo, or the group may no longer be accepting applications.
                  </>
                ) : (
                  <>This application link is missing a group identifier.</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2 justify-center pb-6">
              <Button variant="outline" onClick={() => navigate(-1)} data-testid="button-go-back">
                Go Back
              </Button>
              <Button onClick={() => navigate('/')} data-testid="button-go-home">
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
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
              <h2 className="text-2xl font-bold">Your {groupInfo.name} Application Saved!</h2>
              <p className="text-muted-foreground">
                {groupInfo.submissionMessage || <>Thank you for applying to <strong>{groupInfo.name}</strong>. Your application is now saved in Yassu.ai.</>}
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                {isNewUser
                  ? 'Please check your email for your Yassu.ai login credentials. You can use them to sign in, review, edit, or update your application at any time before the deadline.'
                  : 'Your application has been received. You can sign in to your Yassu.ai account anytime to review or update your application before the deadline.'}
              </div>
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
              {groupInfo.redirectUrl && (
                <div className="flex justify-center">
                  <Button onClick={() => window.location.href = groupInfo!.redirectUrl!} style={{ backgroundColor: `hsl(${primaryHSL})` }} className="text-white" data-testid="button-redirect">
                    Continue to {groupInfo.name}
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                className="text-sm"
                data-testid="button-submit-another"
                onClick={() => {
                  setSubmitted(false);
                  setFirstName('');
                  setLastName('');
                  setEmail('');
                  setUniversityName('');
                  setGraduationYear('');
                  setMajor('');
                  setProjectTitle('');
                  setTeamInfo('');
                  setFileNames({});
                  setAnswers((groupInfo?.applicationQuestions || []).map((q: any) => ({ question: q.label, answer: '' })));
                }}
              >
                Submit Another Application
              </Button>
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
      <div className="flex-1 flex flex-col lg:flex-row mt-20">
        <aside
          className="lg:w-[420px] lg:shrink-0 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto text-white flex flex-col"
          style={{ background: `linear-gradient(180deg, hsl(${primaryHSL}), hsl(${primaryHSL} / 0.85))` }}
          data-testid="sidebar-group-info"
        >
          <div className="flex flex-col gap-5 px-8 py-10 lg:px-10 lg:py-12 min-w-0 w-full">
            {groupInfo.logoUrl && (
              <img src={groupInfo.logoUrl} alt={groupInfo.name} className="h-16 object-contain self-start" style={{ width: 'auto', maxWidth: '200px' }} data-testid="img-group-logo" />
            )}
            <h1 className="text-2xl font-bold">{groupInfo.name}</h1>
            {groupInfo.description && (
              <div
                className="group-description text-sm leading-relaxed opacity-90 max-w-none text-left"
                dangerouslySetInnerHTML={{ __html: groupInfo.description.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ') }}
              />
            )}
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-10 lg:overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {groupInfo.applicationDeadline && new Date(groupInfo.applicationDeadline) < new Date() && (
              <Card className="mb-4 border-amber-300 bg-amber-50">
                <CardContent className="pt-6">
                  <p className="text-amber-900 font-semibold">Applications are closed</p>
                  <p className="text-amber-800 text-sm mt-1">
                    The application deadline ({new Date(groupInfo.applicationDeadline).toLocaleString()}) has passed. New applications can no longer be submitted.
                  </p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>{isLoggedIn ? 'New Application' : 'Application'}</CardTitle>
                <CardDescription>
                  {isLoggedIn
                    ? `Submitting as ${profile?.fullName || user?.email}. Fill out the fields below.`
                    : 'Fill out the form below to apply. All fields marked with * are required.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">

              {!isLoggedIn && (
                <>
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

                  <div className="border-t pt-6" />
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="projectTitle">Project Title</Label>
                <Input id="projectTitle" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="Enter your project or startup name" data-testid="input-project-title" />
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
                  ) : q.type === 'radio' ? (
                    <RadioGroup
                      value={answers[i]?.answer || ''}
                      onValueChange={val => setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: val } : a))}
                      data-testid={`input-question-${i}`}
                    >
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt} id={`q${i}-opt${optIdx}`} />
                          <Label htmlFor={`q${i}-opt${optIdx}`} className="font-normal cursor-pointer">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : q.type === 'checkbox' ? (
                    <div className="space-y-2" data-testid={`input-question-${i}`}>
                      {(q.options || []).map((opt, optIdx) => {
                        const selected = (answers[i]?.answer || '').split('|||').filter(Boolean);
                        const isChecked = selected.includes(opt);
                        return (
                          <div key={optIdx} className="flex items-center space-x-2">
                            <Checkbox
                              id={`q${i}-chk${optIdx}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const newSelected = checked ? [...selected, opt] : selected.filter(s => s !== opt);
                                setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: newSelected.join('|||') } : a));
                              }}
                            />
                            <Label htmlFor={`q${i}-chk${optIdx}`} className="font-normal cursor-pointer">{opt}</Label>
                          </div>
                        );
                      })}
                    </div>
                  ) : q.type === 'dropdown' ? (
                    <Select
                      value={answers[i]?.answer || ''}
                      onValueChange={val => setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: val } : a))}
                    >
                      <SelectTrigger data-testid={`input-question-${i}`}>
                        <SelectValue placeholder="Select an option..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(q.options || []).map((opt, optIdx) => (
                          <SelectItem key={optIdx} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : q.type === 'number' ? (
                    <Input
                      type="number"
                      value={answers[i]?.answer || ''}
                      onChange={e => setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a))}
                      placeholder="Enter a number..."
                      required={q.required}
                      data-testid={`input-question-${i}`}
                    />
                  ) : q.type === 'date' ? (
                    <Input
                      type="date"
                      value={answers[i]?.answer || ''}
                      onChange={e => setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a))}
                      required={q.required}
                      data-testid={`input-question-${i}`}
                    />
                  ) : q.type === 'url' ? (
                    <Input
                      type="url"
                      value={answers[i]?.answer || ''}
                      onChange={e => setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a))}
                      placeholder="https://..."
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
                <Label htmlFor="team-info" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  If you have teammates, list their names, roles and emails.
                </Label>
                <Textarea
                  id="team-info"
                  value={teamInfo}
                  onChange={e => setTeamInfo(e.target.value)}
                  rows={4}
                  placeholder="e.g. Jane Smith — CTO — jane@ucla.edu"
                  data-testid="input-team-info"
                />
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
        </main>
      </div>
      <Footer />
    </div>
  );
}
