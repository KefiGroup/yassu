import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Users,
  MessageSquare,
  Send,
  Edit,
  Sparkles,
  FileText,
  Target,
  TrendingUp,
  Lightbulb,
  Rocket,
  GraduationCap,
  DollarSign,
  Loader2,
  Download,
  RefreshCw,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Idea {
  id: string;
  title: string;
  problem: string;
  solution: string | null;
  targetUser: string | null;
  whyNow: string | null;
  assumptions: string | null;
  desiredTeammates: string | null;
  expectedTimeline: string | null;
  stage: string;
  createdAt: string;
  createdBy: number;
  tags?: string[];
}

interface BusinessPlan {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  sections: {
    executiveSummary?: string;
    founderFit?: string;
    competitiveLandscape?: string;
    riskMoat?: string;
    mvpDesign?: string;
    teamTalent?: string;
    launchPlan?: string;
    schoolAdvantage?: string;
    fundingPitch?: string;
  };
}

const stageColors: Record<string, string> = {
  concept: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  validating: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  building: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  launched: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

const planSections = [
  { id: 'executiveSummary', label: 'Full Plan', icon: FileText },
  { id: 'founderFit', label: 'Founder Fit', icon: Lightbulb },
  { id: 'competitiveLandscape', label: 'Competitive Landscape', icon: TrendingUp },
  { id: 'riskMoat', label: 'Risk & Moat', icon: Target },
  { id: 'mvpDesign', label: 'MVP Design', icon: Sparkles },
  { id: 'teamTalent', label: 'Team & Talent', icon: Users },
  { id: 'launchPlan', label: 'Launch Plan', icon: Rocket },
  { id: 'schoolAdvantage', label: 'School Advantage', icon: GraduationCap },
  { id: 'fundingPitch', label: 'Funding Pitch', icon: DollarSign },
];

export default function IdeaDetail() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [businessPlan, setBusinessPlan] = useState<BusinessPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('executiveSummary');

  useEffect(() => {
    async function fetchIdea() {
      if (!ideaId) return;

      try {
        const ideaData = await api.ideas.get(ideaId);
        setIdea(ideaData);
        
        // Check for existing business plan
        try {
          const workflows = await api.workflows.list();
          const planWorkflow = workflows.find(
            (w: any) => w.ideaId === ideaId && w.workflowType === 'business_plan'
          );
          if (planWorkflow) {
            const fullWorkflow = await api.workflows.get(planWorkflow.id);
            if (fullWorkflow.artifacts && fullWorkflow.artifacts.length > 0) {
              const planArtifact = fullWorkflow.artifacts[0];
              if (planArtifact && planArtifact.content) {
                setBusinessPlan({
                  id: fullWorkflow.id,
                  status: fullWorkflow.status,
                  createdAt: fullWorkflow.createdAt,
                  sections: JSON.parse(planArtifact.content),
                });
              }
            } else if (fullWorkflow.status === 'pending' || fullWorkflow.status === 'running') {
              setBusinessPlan({
                id: fullWorkflow.id,
                status: fullWorkflow.status,
                createdAt: fullWorkflow.createdAt,
                sections: {},
              });
            }
          }
        } catch (e) {
          // No business plan yet
        }
      } catch (error) {
        console.error('Failed to fetch idea:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchIdea();
  }, [ideaId]);

  const handleGeneratePlan = async () => {
    if (!ideaId || !idea) return;
    
    setGenerating(true);
    try {
      const result = await api.workflows.run({
        workflowType: 'business_plan',
        ideaId,
        inputs: {
          title: idea.title,
          problem: idea.problem,
          solution: idea.solution,
          targetUser: idea.targetUser,
          whyNow: idea.whyNow,
        },
      });
      
      setBusinessPlan({
        id: result.id,
        status: 'running',
        createdAt: new Date().toISOString(),
        sections: {},
      });
      
      toast({
        title: 'Generating Business Plan',
        description: 'AI is analyzing your idea. This may take 1-2 minutes.',
      });
      
      // Poll for completion
      pollForCompletion(result.id);
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Could not start business plan generation.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const pollForCompletion = async (workflowId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      try {
        const workflow = await api.workflows.get(workflowId);
        
        if (workflow.status === 'completed' && workflow.artifacts && workflow.artifacts.length > 0) {
          const planArtifact = workflow.artifacts[0];
          if (planArtifact && planArtifact.content) {
            setBusinessPlan({
              id: workflow.id,
              status: 'completed',
              createdAt: workflow.createdAt,
              sections: JSON.parse(planArtifact.content),
            });
            toast({
              title: 'Business Plan Ready',
              description: 'Your AI-generated business plan is complete!',
            });
            return;
          }
        } else if (workflow.status === 'failed') {
          setBusinessPlan(prev => prev ? { ...prev, status: 'failed' } : null);
          toast({
            title: 'Generation Failed',
            description: 'Could not generate business plan. Please try again.',
            variant: 'destructive',
          });
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 4000);
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };
    
    setTimeout(poll, 4000);
  };

  const handleDeleteIdea = async () => {
    if (!ideaId) return;
    
    setDeleting(true);
    try {
      await api.ideas.delete(ideaId);
      toast({
        title: 'Idea Deleted',
        description: 'Your idea has been permanently deleted.',
      });
      navigate('/portal/ideas');
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Could not delete the idea. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Idea not found</p>
        <Button variant="outline" onClick={() => navigate('/portal/ideas')} data-testid="button-back-ideas">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>
      </div>
    );
  }

  const isOwner = user?.id === idea.createdBy;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <Button
          variant="ghost"
          onClick={() => navigate('/portal/ideas')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>
        {isOwner && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/portal/ideas/${ideaId}/edit`)}
              data-testid="button-edit-idea"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Idea
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/50"
                  data-testid="button-delete-idea"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Idea</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{idea?.title}"? This action cannot be undone and will permanently remove this idea and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteIdea}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground"
                    data-testid="button-confirm-delete"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle className="text-2xl">{idea.title}</CardTitle>
                  <Badge className={stageColors[idea.stage] || stageColors.concept}>
                    {idea.stage}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Founder
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(idea.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Problem</h3>
              <p className="text-muted-foreground">{idea.problem}</p>
            </div>
            {idea.solution && (
              <div>
                <h3 className="font-semibold mb-2">Solution</h3>
                <p className="text-muted-foreground">{idea.solution}</p>
              </div>
            )}
            {idea.targetUser && (
              <div>
                <h3 className="font-semibold mb-2">Target Users</h3>
                <p className="text-muted-foreground">{idea.targetUser}</p>
              </div>
            )}
            {idea.whyNow && (
              <div>
                <h3 className="font-semibold mb-2">Why Now?</h3>
                <p className="text-muted-foreground">{idea.whyNow}</p>
              </div>
            )}
            {idea.tags && idea.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {idea.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    AI Business Plan
                    {businessPlan?.status === 'completed' && (
                      <Badge className="bg-emerald-500 text-white">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </CardTitle>
                  {businessPlan?.createdAt && (
                    <p className="text-sm text-muted-foreground">
                      Generated {new Date(businessPlan.createdAt).toLocaleDateString()} at{' '}
                      {new Date(businessPlan.createdAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {businessPlan?.status === 'completed' && (
                  <>
                    <Button variant="outline" size="sm" data-testid="button-download-plan">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGeneratePlan}
                      disabled={generating}
                      data-testid="button-regenerate-plan"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!businessPlan ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Generate AI Business Plan</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Our AI will analyze your idea and generate a comprehensive business plan
                  covering 8 key areas in about 2 minutes.
                </p>
                <Button
                  onClick={handleGeneratePlan}
                  disabled={generating}
                  data-testid="button-generate-plan"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Business Plan
                    </>
                  )}
                </Button>
              </div>
            ) : businessPlan.status === 'running' || businessPlan.status === 'pending' ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Generating Your Business Plan...</h3>
                <p className="text-muted-foreground">
                  AI is analyzing your idea. This usually takes 1-2 minutes.
                </p>
              </div>
            ) : businessPlan.status === 'failed' ? (
              <div className="text-center py-8">
                <p className="text-destructive mb-4">Generation failed. Please try again.</p>
                <Button onClick={handleGeneratePlan} disabled={generating}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                    {planSections.map((section) => (
                      <TabsTrigger
                        key={section.id}
                        value={section.id}
                        className="text-xs sm:text-sm"
                        data-testid={`tab-${section.id}`}
                      >
                        <section.icon className="w-4 h-4 mr-1.5" />
                        {section.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {planSections.map((section) => (
                    <TabsContent key={section.id} value={section.id} className="mt-6">
                      <Card className="bg-muted/30">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <section.icon className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="font-semibold text-lg">{section.label}</h3>
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {businessPlan.sections[section.id as keyof typeof businessPlan.sections] ? (
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: (businessPlan.sections[section.id as keyof typeof businessPlan.sections] || '')
                                    .replace(/\n/g, '<br/>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
                                    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
                                    .replace(/^# (.*?)$/gm, '<h1>$1</h1>'),
                                }}
                              />
                            ) : (
                              <p className="text-muted-foreground italic">
                                This section is not available.
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
