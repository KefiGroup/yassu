import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  Shield,
  FileText,
  Users,
  Rocket,
  GraduationCap,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Copy,
  Download,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const workflows: Record<string, { title: string; description: string; icon: typeof Sparkles; inputs: { key: string; label: string; placeholder: string; type: 'text' | 'textarea' }[] }> = {
  idea_founder_fit: {
    title: 'Idea & Founder Fit',
    description: 'Analyze your alignment with the problem you\'re solving',
    icon: Sparkles,
    inputs: [
      { key: 'ideaTitle', label: 'Idea Title', placeholder: 'What\'s your startup idea called?', type: 'text' },
      { key: 'problem', label: 'Problem', placeholder: 'What problem are you solving? Who has this problem?', type: 'textarea' },
      { key: 'motivation', label: 'Your Motivation', placeholder: 'Why are you passionate about solving this?', type: 'textarea' },
    ],
  },
  competitive_landscape: {
    title: 'Competitive Landscape',
    description: 'Scan the market and identify opportunities',
    icon: Search,
    inputs: [
      { key: 'ideaTitle', label: 'Idea/Product', placeholder: 'What are you building?', type: 'text' },
      { key: 'industry', label: 'Industry', placeholder: 'What industry or market are you in?', type: 'text' },
      { key: 'knownCompetitors', label: 'Known Competitors', placeholder: 'Any competitors you already know about?', type: 'textarea' },
    ],
  },
  risk_moat_builder: {
    title: 'Risk & Moat Builder',
    description: 'Identify risks and build defensibility',
    icon: Shield,
    inputs: [
      { key: 'ideaTitle', label: 'Idea', placeholder: 'What\'s your startup idea?', type: 'text' },
      { key: 'currentAdvantages', label: 'Current Advantages', placeholder: 'What advantages do you have today?', type: 'textarea' },
      { key: 'concerns', label: 'Biggest Concerns', placeholder: 'What keeps you up at night about this idea?', type: 'textarea' },
    ],
  },
  product_mvp_design: {
    title: 'Product & MVP Design',
    description: 'Design your product roadmap and MVP',
    icon: FileText,
    inputs: [
      { key: 'ideaTitle', label: 'Product Name', placeholder: 'What are you building?', type: 'text' },
      { key: 'coreFeature', label: 'Core Feature', placeholder: 'What\'s the one thing your product must do?', type: 'textarea' },
      { key: 'targetUser', label: 'Target User', placeholder: 'Who will use this first?', type: 'text' },
    ],
  },
  team_talent: {
    title: 'Team & Talent',
    description: 'Map skills and find the right teammates',
    icon: Users,
    inputs: [
      { key: 'ideaTitle', label: 'Startup', placeholder: 'What are you building?', type: 'text' },
      { key: 'currentTeam', label: 'Current Team', placeholder: 'Who\'s on the team and what are their skills?', type: 'textarea' },
      { key: 'neededSkills', label: 'Needed Skills', placeholder: 'What skills are you looking for?', type: 'text' },
    ],
  },
  launch_plan: {
    title: 'Launch Plan',
    description: 'Create your go-to-market strategy',
    icon: Rocket,
    inputs: [
      { key: 'ideaTitle', label: 'Product', placeholder: 'What are you launching?', type: 'text' },
      { key: 'targetAudience', label: 'Target Audience', placeholder: 'Who are your first 100 users?', type: 'textarea' },
      { key: 'launchTimeline', label: 'Timeline', placeholder: 'When do you want to launch?', type: 'text' },
    ],
  },
  school_advantage: {
    title: 'School Advantage',
    description: 'Leverage your university\'s resources',
    icon: GraduationCap,
    inputs: [
      { key: 'ideaTitle', label: 'Startup Idea', placeholder: 'What are you building?', type: 'text' },
      { key: 'resourcesNeeded', label: 'Resources Needed', placeholder: 'What kind of help do you need? (funding, mentorship, lab access, etc.)', type: 'textarea' },
    ],
  },
  funding_pitch: {
    title: 'Funding & Pitch',
    description: 'Prepare your pitch and find funding',
    icon: DollarSign,
    inputs: [
      { key: 'ideaTitle', label: 'Startup', placeholder: 'What are you building?', type: 'text' },
      { key: 'traction', label: 'Current Traction', placeholder: 'What progress have you made? Users, revenue, partnerships?', type: 'textarea' },
      { key: 'askAmount', label: 'Funding Goal', placeholder: 'How much are you looking to raise?', type: 'text' },
    ],
  },
};

export default function WorkflowRun() {
  const { workflowType } = useParams<{ workflowType: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<'input' | 'running' | 'result'>('input');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [output, setOutput] = useState('');
  const [progress, setProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);

  const workflow = workflowType ? workflows[workflowType] : null;
  const Icon = workflow?.icon || Sparkles;

  // Pre-fill from idea if provided
  useEffect(() => {
    const ideaId = searchParams.get('idea');
    if (ideaId) {
      supabase
        .from('ideas')
        .select('title, problem, solution, target_user')
        .eq('id', ideaId)
        .single()
        .then(({ data }) => {
          if (data) {
            setInputs((prev) => ({
              ...prev,
              ideaTitle: data.title,
              problem: data.problem || '',
              targetUser: data.target_user || '',
            }));
          }
        });
    }
  }, [searchParams]);

  if (!workflow || !workflowType) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Workflow not found</p>
        <Button variant="outline" onClick={() => navigate('/portal/workflows')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Workflows
        </Button>
      </div>
    );
  }

  const handleInputChange = (key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const runWorkflow = async () => {
    setStep('running');
    setOutput('');
    setProgress(10);
    setIsStreaming(true);

    try {
      // Get university name if available
      let universityName = null;
      if (profile?.university_id) {
        const { data } = await supabase
          .from('universities')
          .select('name')
          .eq('id', profile.university_id)
          .single();
        universityName = data?.name;
      }

      setProgress(20);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-workflow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            workflowType,
            inputs,
            ideaContext: {
              title: inputs.ideaTitle,
              problem: inputs.problem,
              solution: inputs.coreFeature,
              target_user: inputs.targetUser || inputs.targetAudience,
            },
            userContext: {
              university: universityName,
              major: profile?.major,
              skills: profile?.skills,
              interests: profile?.interests,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run workflow');
      }

      setProgress(40);

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullOutput = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullOutput += content;
                setOutput(fullOutput);
                setProgress(Math.min(90, 40 + (fullOutput.length / 50)));
              }
            } catch {
              // Incomplete JSON, continue
            }
          }
        }
      }

      setProgress(100);
      setStep('result');
      setIsStreaming(false);

      // Save workflow run to database
      const { data: runData, error: runError } = await supabase
        .from('workflow_runs')
        .insert({
          user_id: user?.id,
          workflow_type: workflowType as any,
          inputs,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runData && !runError) {
        await supabase.from('workflow_artifacts').insert({
          workflow_run_id: runData.id,
          content: fullOutput,
          version: 1,
        });
      }

      toast({
        title: 'Workflow completed!',
        description: 'Your analysis has been generated and saved.',
      });
    } catch (error) {
      console.error('Workflow error:', error);
      setIsStreaming(false);
      setStep('input');
      toast({
        title: 'Workflow failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    toast({
      title: 'Copied!',
      description: 'Output copied to clipboard',
    });
  };

  const downloadMarkdown = () => {
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowType}-output.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const regenerate = () => {
    setOutput('');
    runWorkflow();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => navigate('/portal/workflows')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{workflow.title}</h1>
            <p className="text-muted-foreground">{workflow.description}</p>
          </div>
        </div>
      </motion.div>

      {/* Progress */}
      {step !== 'input' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Progress value={progress} className="h-2" />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* Input Step */}
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Tell us about your idea</CardTitle>
                <CardDescription>
                  Provide context for the AI to generate personalized insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workflow.inputs.map((input) => (
                  <div key={input.key} className="space-y-2">
                    <Label htmlFor={input.key}>{input.label}</Label>
                    {input.type === 'textarea' ? (
                      <Textarea
                        id={input.key}
                        placeholder={input.placeholder}
                        value={inputs[input.key] || ''}
                        onChange={(e) => handleInputChange(input.key, e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={input.key}
                        placeholder={input.placeholder}
                        value={inputs[input.key] || ''}
                        onChange={(e) => handleInputChange(input.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}

                <Button onClick={runWorkflow} className="w-full" size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Analysis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Running Step */}
        {step === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <CardTitle>Generating your analysis...</CardTitle>
                </div>
                <CardDescription>This usually takes 10-30 seconds</CardDescription>
              </CardHeader>
              <CardContent>
                {output && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{output}</ReactMarkdown>
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Result Step */}
        {step === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <CardTitle>Analysis Complete</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadMarkdown}>
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={regenerate}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{output}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep('input')} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Edit Inputs
              </Button>
              <Button onClick={() => navigate('/portal/workflows')} className="flex-1">
                Run Another Workflow
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
