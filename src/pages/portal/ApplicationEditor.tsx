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
import { Loader2, Save, Send, CheckCircle2, Clock, XCircle, Upload, FileText, X, ArrowLeft, UserPlus, Mail } from 'lucide-react';

interface GroupInfo {
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string | null;
  applicationQuestions: { label: string; type: 'text' | 'textarea' | 'file' | 'radio' | 'checkbox' | 'dropdown' | 'number' | 'date' | 'url'; required: boolean; options?: string[] }[];
}

interface Application {
  id: string;
  status: string;
  answers: { question: string; answer: string }[] | null;
  projectTitle: string | null;
  universityName: string | null;
  graduationYear: string | null;
  major: string | null;
  teamEmails: string[] | null;
  createdAt: string;
  reviewedAt: string | null;
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

export default function ApplicationEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [fileNames, setFileNames] = useState<Record<number, string>>({});

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [major, setMajor] = useState('');
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [teamEmailInput, setTeamEmailInput] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/groups/${slug}/my-application`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load application');
        const data = await res.json();
        setGroup(data.group);

        let app = data.application;
        if (!app && data.group) {
          const createRes = await fetch(`/api/groups/${slug}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ motivation: '', asDraft: true }),
          });
          if (createRes.ok) {
            const reloadRes = await fetch(`/api/groups/${slug}/my-application`, { credentials: 'include' });
            if (reloadRes.ok) {
              const reloaded = await reloadRes.json();
              app = reloaded.application;
            }
          }
        }

        setApplication(app);
        setProjectTitle(app?.projectTitle || '');
        setUniversityName(app?.universityName || '');
        setGraduationYear(app?.graduationYear || '');
        setMajor(app?.major || '');
        setTeamEmails(app?.teamEmails || []);

        const questions = data.group?.applicationQuestions || [];
        const savedAnswers = app?.answers || [];
        const merged = questions.map((q: { label: string }, idx: number) => {
          const existing = savedAnswers[idx];
          return { question: q.label, answer: existing?.answer || '' };
        });
        setAnswers(merged);
        const names: Record<number, string> = {};
        merged.forEach((a: { answer: string }, idx: number) => {
          if (a.answer && a.answer.startsWith('[file:')) {
            const match = a.answer.match(/^\[file:([^\]]+)\]/);
            if (match) names[idx] = match[1];
          }
        });
        setFileNames(names);
      } catch {
        toast({ title: 'Failed to load application', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchData();
  }, [slug, toast]);

  const uploadFile = async (file: File, questionIdx: number) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB', variant: 'destructive' });
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({ title: 'Unsupported file type', variant: 'destructive' });
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
      const uploadRes = await fetch(uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!uploadRes.ok) throw new Error('Failed to upload file');
      setAnswers(prev => prev.map((a, idx) => idx === questionIdx ? { ...a, answer: `[file:${file.name}]${objectPath}` } : a));
      setFileNames(prev => ({ ...prev, [questionIdx]: file.name }));
      setHasChanges(true);
      toast({ title: 'File uploaded successfully' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${slug}/my-application`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers, projectTitle, universityName, graduationYear, major, teamEmails }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setHasChanges(false);
      toast({ title: 'Progress saved!' });
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const questions = group?.applicationQuestions || [];
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].required && !answers[i]?.answer?.trim()) {
        toast({ title: `Please answer: "${questions[i].label}"`, variant: 'destructive' });
        return;
      }
    }

    if (hasChanges) {
      const saved = await handleSave();
      if (!saved) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${slug}/my-application/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }
      toast({ title: 'Application submitted!' });
      setApplication(prev => prev ? { ...prev, status: 'pending' } : prev);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group || !application) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              {!group ? 'Group not found.' : 'No draft application found for this group.'}
            </p>
            <Button className="mt-4" onClick={() => navigate('/portal')} data-testid="button-back-portal">Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDraft = application?.status === 'draft';
  const isPending = application?.status === 'pending';
  const isApproved = application?.status === 'approved';
  const isRejected = application?.status === 'rejected';
  const isReadOnly = !isDraft && !isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/portal')} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{group.name} Application</CardTitle>
              <CardDescription>
                {isDraft && 'Review your answers and submit when ready.'}
                {isPending && 'Your application is under review. You can still edit your answers.'}
                {isApproved && 'Your application has been approved!'}
                {isRejected && 'Your application was not accepted.'}
                {!application && 'Fill out the form to apply.'}
              </CardDescription>
            </div>
            {application && (
              <Badge
                variant="outline"
                className={
                  isDraft ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200' :
                  isPending ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200' :
                  isApproved ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200' :
                  'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200'
                }
                data-testid="badge-app-status"
              >
                {isDraft && <><Clock className="w-3 h-3 mr-1" /> Draft</>}
                {isPending && <><Clock className="w-3 h-3 mr-1" /> Under Review</>}
                {isApproved && <><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</>}
                {isRejected && <><XCircle className="w-3 h-3 mr-1" /> Rejected</>}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="universityName">University Name *</Label>
              <Input
                id="universityName"
                value={universityName}
                onChange={e => { setUniversityName(e.target.value); setHasChanges(true); }}
                placeholder={isReadOnly ? '' : 'e.g. UCLA'}
                disabled={isReadOnly}
                required
                data-testid="input-university-name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="graduationYear">Year of Graduation *</Label>
                <Input
                  id="graduationYear"
                  value={graduationYear}
                  onChange={e => { setGraduationYear(e.target.value); setHasChanges(true); }}
                  placeholder={isReadOnly ? '' : 'e.g. 2026'}
                  disabled={isReadOnly}
                  required
                  data-testid="input-graduation-year"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Major *</Label>
                <Input
                  id="major"
                  value={major}
                  onChange={e => { setMajor(e.target.value); setHasChanges(true); }}
                  placeholder={isReadOnly ? '' : 'e.g. Computer Science'}
                  disabled={isReadOnly}
                  required
                  data-testid="input-major"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="space-y-2">
                <Label htmlFor="projectTitle">Project Title</Label>
                <Input
                  id="projectTitle"
                  value={projectTitle}
                  onChange={e => { setProjectTitle(e.target.value); setHasChanges(true); }}
                  placeholder={isReadOnly ? '' : 'Enter your project or startup name'}
                  disabled={isReadOnly}
                  data-testid="input-project-title"
                />
              </div>
            </div>

            {(group.applicationQuestions || []).map((q, i) => (
              <div key={i} className="space-y-2">
                <Label>{q.label} {q.required && '*'}</Label>
                {q.type === 'file' ? (
                  <div className="space-y-2">
                    {answers[i]?.answer ? (
                      <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{fileNames[i] || 'File uploaded'}</span>
                        {!isReadOnly && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: '' } : a));
                              setFileNames(prev => { const next = { ...prev }; delete next[i]; return next; });
                              setHasChanges(true);
                            }}
                            data-testid={`button-remove-file-${i}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ) : !isReadOnly ? (
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
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No file uploaded</p>
                    )}
                  </div>
                ) : q.type === 'textarea' ? (
                  <Textarea
                    value={answers[i]?.answer || ''}
                    onChange={e => {
                      setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a));
                      setHasChanges(true);
                    }}
                    placeholder={isReadOnly ? '' : 'Your answer...'}
                    rows={4}
                    disabled={isReadOnly}
                    data-testid={`input-question-${i}`}
                  />
                ) : q.type === 'radio' ? (
                  <RadioGroup
                    value={answers[i]?.answer || ''}
                    onValueChange={val => {
                      setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: val } : a));
                      setHasChanges(true);
                    }}
                    disabled={isReadOnly}
                    data-testid={`input-question-${i}`}
                  >
                    {(q.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt} id={`eq${i}-opt${optIdx}`} />
                        <Label htmlFor={`eq${i}-opt${optIdx}`} className="font-normal cursor-pointer">{opt}</Label>
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
                            id={`eq${i}-chk${optIdx}`}
                            checked={isChecked}
                            disabled={isReadOnly}
                            onCheckedChange={(checked) => {
                              const newSelected = checked ? [...selected, opt] : selected.filter(s => s !== opt);
                              setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: newSelected.join('|||') } : a));
                              setHasChanges(true);
                            }}
                          />
                          <Label htmlFor={`eq${i}-chk${optIdx}`} className="font-normal cursor-pointer">{opt}</Label>
                        </div>
                      );
                    })}
                  </div>
                ) : q.type === 'dropdown' ? (
                  <Select
                    value={answers[i]?.answer || ''}
                    onValueChange={val => {
                      setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: val } : a));
                      setHasChanges(true);
                    }}
                    disabled={isReadOnly}
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
                    onChange={e => {
                      setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a));
                      setHasChanges(true);
                    }}
                    placeholder={isReadOnly ? '' : 'Enter a number...'}
                    disabled={isReadOnly}
                    data-testid={`input-question-${i}`}
                  />
                ) : q.type === 'date' ? (
                  <Input
                    type="date"
                    value={answers[i]?.answer || ''}
                    onChange={e => {
                      setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a));
                      setHasChanges(true);
                    }}
                    disabled={isReadOnly}
                    data-testid={`input-question-${i}`}
                  />
                ) : q.type === 'url' ? (
                  <Input
                    type="url"
                    value={answers[i]?.answer || ''}
                    onChange={e => {
                      setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a));
                      setHasChanges(true);
                    }}
                    placeholder={isReadOnly ? '' : 'https://...'}
                    disabled={isReadOnly}
                    data-testid={`input-question-${i}`}
                  />
                ) : (
                  <Input
                    value={answers[i]?.answer || ''}
                    onChange={e => {
                      setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a));
                      setHasChanges(true);
                    }}
                    placeholder={isReadOnly ? '' : 'Your answer...'}
                    disabled={isReadOnly}
                    data-testid={`input-question-${i}`}
                  />
                )}
              </div>
            ))}

            {!isReadOnly && (
              <div className="space-y-3 pt-2">
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
                          setHasChanges(true);
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
                        setHasChanges(true);
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
                          onClick={() => {
                            setTeamEmails(prev => prev.filter((_, i) => i !== idx));
                            setHasChanges(true);
                          }}
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
            )}

            {isDraft && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleSave()}
                  disabled={saving || !hasChanges}
                  className="flex-1"
                  data-testid="button-save-draft"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Progress
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1"
                  data-testid="button-submit-application"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit Application
                </Button>
              </div>
            )}

            {isPending && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleSave()}
                  disabled={saving || !hasChanges}
                  className="flex-1"
                  data-testid="button-save-pending"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            )}

            {!application && group.applicationQuestions?.length > 0 && (
              <p className="text-sm text-muted-foreground text-center">No application found for this group.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
