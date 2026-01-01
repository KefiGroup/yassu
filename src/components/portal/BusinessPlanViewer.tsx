import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import {
  FileText,
  RefreshCw,
  Download,
  Lightbulb,
  TrendingUp,
  Shield,
  Package,
  Users,
  Rocket,
  GraduationCap,
  DollarSign,
  Loader2,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface BusinessPlanViewerProps {
  ideaId: string;
}

interface WorkflowRun {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface WorkflowArtifact {
  id: string;
  content: string | null;
  metadata: {
    type?: string;
    sections?: string[];
    idea_title?: string;
  } | null;
  created_at: string;
}

const SECTION_ICONS: Record<string, any> = {
  idea_founder_fit: Lightbulb,
  competitive_landscape: TrendingUp,
  risk_moat_builder: Shield,
  product_mvp_design: Package,
  team_talent: Users,
  launch_plan: Rocket,
  school_advantage: GraduationCap,
  funding_pitch: DollarSign,
};

const SECTION_LABELS: Record<string, string> = {
  idea_founder_fit: 'Founder Fit',
  competitive_landscape: 'Competition',
  risk_moat_builder: 'Risk & Moat',
  product_mvp_design: 'MVP Design',
  team_talent: 'Team',
  launch_plan: 'Launch',
  school_advantage: 'University',
  funding_pitch: 'Funding',
};

export default function BusinessPlanViewer({ ideaId }: BusinessPlanViewerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [artifact, setArtifact] = useState<WorkflowArtifact | null>(null);
  const [activeSection, setActiveSection] = useState('full');

  const fetchBusinessPlan = async () => {
    setLoading(true);

    // Find the latest workflow run for this idea with a business plan
    const { data: runs } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (runs && runs.length > 0) {
      setWorkflowRun(runs[0]);

      // If completed, stop regenerating state
      if (runs[0].status === 'completed') {
        setRegenerating(false);
      }

      // Fetch the artifact
      const { data: artifacts } = await supabase
        .from('workflow_artifacts')
        .select('*')
        .eq('workflow_run_id', runs[0].id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (artifacts && artifacts.length > 0) {
        setArtifact(artifacts[0] as WorkflowArtifact);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchBusinessPlan();
  }, [ideaId]);

  // Poll for updates if the workflow is running
  useEffect(() => {
    if (workflowRun?.status !== 'running' && !regenerating) return;

    const interval = setInterval(async () => {
      await fetchBusinessPlan();
    }, 3000);

    return () => clearInterval(interval);
  }, [workflowRun?.status, regenerating]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    
    try {
      const { error } = await supabase.functions.invoke('generate-business-plan', {
        body: { ideaId },
      });

      if (error) throw error;

      toast({
        title: 'Generating business plan',
        description: 'This may take a minute. The page will update automatically.',
      });

      // Set a temporary running state to trigger polling
      setWorkflowRun({ id: '', status: 'running', created_at: new Date().toISOString(), completed_at: null });
      
      // Fetch after a short delay to get the new workflow run
      setTimeout(() => fetchBusinessPlan(), 2000);
    } catch (error) {
      console.error('Error generating plan:', error);
      toast({
        title: 'Error generating plan',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      setRegenerating(false);
    }
  };

  const handleDownload = () => {
    if (!artifact?.content) return;

    const blob = new Blob([artifact.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-plan-${ideaId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Parse sections from the full business plan
  const parseSections = (content: string) => {
    const sections: Record<string, string> = {};
    const sectionHeaders = [
      'Idea-Founder Fit',
      'Competitive Landscape',
      'Risk & Moat Analysis',
      'Product & MVP Design',
      'Team & Talent Strategy',
      'Go-to-Market Plan',
      'University Advantage',
      'Funding & Pitch',
    ];

    for (let i = 0; i < sectionHeaders.length; i++) {
      const start = content.indexOf(`## ${sectionHeaders[i]}`);
      if (start === -1) continue;

      const nextStart = i + 1 < sectionHeaders.length 
        ? content.indexOf(`## ${sectionHeaders[i + 1]}`)
        : content.length;

      const sectionContent = content.slice(start, nextStart !== -1 ? nextStart : undefined);
      const key = Object.keys(SECTION_LABELS).find(k => SECTION_LABELS[k] === sectionHeaders[i].split(' ')[0]) 
        || sectionHeaders[i].toLowerCase().replace(/\s+/g, '_');
      sections[key] = sectionContent;
    }

    return sections;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            AI Business Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!workflowRun) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            AI Business Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            No business plan generated yet.
          </p>
          <Button onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Business Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sections = artifact?.content ? parseSections(artifact.content) : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              AI Business Plan
            </CardTitle>
            <div className="flex items-center gap-2">
              {workflowRun.status === 'running' ? (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating...
                </Badge>
              ) : workflowRun.status === 'completed' ? (
                <Badge variant="default" className="gap-1 bg-emerald-500">
                  <CheckCircle className="w-3 h-3" />
                  Complete
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {workflowRun.status}
                </Badge>
              )}
            </div>
          </div>
          {workflowRun.completed_at && (
            <p className="text-sm text-muted-foreground">
              Generated {new Date(workflowRun.completed_at).toLocaleDateString()} at{' '}
              {new Date(workflowRun.completed_at).toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {workflowRun.status === 'running' ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium">Generating your business plan...</p>
              <p className="text-muted-foreground">
                Our AI is analyzing your idea across 8 key areas. This typically takes 1-2 minutes.
              </p>
            </div>
          ) : artifact?.content ? (
            <>
              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>

              <Tabs value={activeSection} onValueChange={setActiveSection}>
                <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
                  <TabsTrigger value="full" className="text-xs">
                    Full Plan
                  </TabsTrigger>
                  {Object.keys(SECTION_LABELS).map((key) => {
                    const Icon = SECTION_ICONS[key];
                    return (
                      <TabsTrigger key={key} value={key} className="text-xs gap-1">
                        {Icon && <Icon className="w-3 h-3" />}
                        {SECTION_LABELS[key]}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value="full" className="mt-0">
                  <div className="prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
                    <ReactMarkdown>{artifact.content}</ReactMarkdown>
                  </div>
                </TabsContent>

                {Object.keys(SECTION_LABELS).map((key) => (
                  <TabsContent key={key} value={key} className="mt-0">
                    <div className="prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
                      <ReactMarkdown>
                        {sections[key] || `No ${SECTION_LABELS[key]} analysis available.`}
                      </ReactMarkdown>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Business plan is being generated...
              </p>
              <Button onClick={fetchBusinessPlan} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
