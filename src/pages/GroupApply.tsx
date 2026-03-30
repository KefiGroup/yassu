import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Upload } from 'lucide-react';

interface GroupPublicInfo {
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  applicationQuestions: { label: string; type: 'text' | 'textarea' | 'file'; required: boolean }[];
}

export default function GroupApply() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [groupInfo, setGroupInfo] = useState<GroupPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`/api/groups/${slug}/public-info`);
        if (!res.ok) throw new Error('Group not found');
        const data = await res.json();
        setGroupInfo(data);
        setAnswers((data.applicationQuestions || []).map((q: any) => ({ question: q.label, answer: '' })));
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
      <div className="w-full py-6 px-4" style={{ background: `linear-gradient(135deg, hsl(${primaryHSL}), hsl(${primaryHSL} / 0.8))` }}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          {groupInfo.logoUrl && (
            <img src={groupInfo.logoUrl} alt={groupInfo.name} className="h-12 w-12 rounded-lg object-contain bg-white/20 p-1" />
          )}
          <div className="text-white">
            <h1 className="text-2xl font-bold">{groupInfo.name}</h1>
            {groupInfo.description && <p className="text-sm opacity-90">{groupInfo.description}</p>}
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
                  {q.type === 'textarea' ? (
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
      </div>
    </div>
  );
}
