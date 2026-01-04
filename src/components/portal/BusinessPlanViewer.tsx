import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  competitive_landscape: 'Competitive Landscape',
  risk_moat_builder: 'Risk & Moat',
  product_mvp_design: 'MVP Design',
  team_talent: 'Team & Talent',
  launch_plan: 'Launch Plan',
  school_advantage: 'School Advantage',
  funding_pitch: 'Funding Pitch',
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
  const parseSections = (content: string): { key: string; title: string; content: string }[] => {
    const sections: { key: string; title: string; content: string }[] = [];
    
    // Split by ## headers
    const parts = content.split(/(?=^##\s)/m);
    
    // Priority-ordered keywords for each section (first match wins)
    const sectionPatterns: { key: string; patterns: string[] }[] = [
      { key: 'idea_founder_fit', patterns: ['founder fit', 'founder-fit', 'idea-founder', 'why you', 'founder motivation', 'problem statement', 'initial hypothesis'] },
      { key: 'competitive_landscape', patterns: ['competitive landscape', 'competitive analysis', 'competition', 'competitors', 'market landscape', 'market analysis', 'market map', 'competitor grid', 'whitespace'] },
      { key: 'risk_moat_builder', patterns: ['risk', 'moat', 'defensibility', 'barriers', 'swot', 'strategic advisor'] },
      { key: 'product_mvp_design', patterns: ['mvp', 'product design', 'product roadmap', 'minimum viable', 'features', 'product strategy', 'user journey', 'wireframe', 'tech stack'] },
      { key: 'team_talent', patterns: ['team', 'talent', 'hiring', 'collaborator', 'roles', 'founding team', 'personnel', 'org chart'] },
      { key: 'launch_plan', patterns: ['launch', 'go-to-market', 'gtm', 'marketing strategy', 'growth', 'acquisition', 'distribution', 'launch checklist', 'metrics dashboard'] },
      { key: 'school_advantage', patterns: ['school', 'university', 'campus', 'student', 'academic', 'college', 'education', 'university advantage', 'university resource'] },
      { key: 'funding_pitch', patterns: ['funding', 'pitch', 'investor', 'raise', 'capital', 'valuation', 'investment', 'deck', 'fundraising', 'one-page pitch', 'investor intro'] },
    ];

    for (const part of parts) {
      if (!part.startsWith('##')) continue;
      
      const lines = part.split('\n');
      const titleLine = lines[0].replace(/^##\s*\d*\.?\s*/, '').trim();
      const contentText = lines.slice(1).join('\n').trim();
      
      // Skip empty sections or section headers only
      if (!contentText || contentText.length < 10) continue;
      
      // Find matching key using priority-ordered patterns
      const lowerTitle = titleLine.toLowerCase();
      let matchedKey = 'other';
      
      for (const { key, patterns } of sectionPatterns) {
        if (patterns.some(pattern => lowerTitle.includes(pattern))) {
          matchedKey = key;
          break;
        }
      }
      
      sections.push({
        key: matchedKey,
        title: titleLine,
        content: contentText,
      });
    }

    return sections;
  };

  // Markdown components for rendering
  const markdownComponents = {
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-border rounded-lg overflow-hidden text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-muted/50">{children}</thead>
    ),
    tbody: ({ children }: any) => (
      <tbody>{children}</tbody>
    ),
    th: ({ children }: any) => (
      <th className="border border-border px-3 py-2 text-left font-semibold text-foreground text-xs whitespace-nowrap">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border border-border px-3 py-2 text-muted-foreground text-sm">
        {children}
      </td>
    ),
    tr: ({ children }: any) => (
      <tr className="even:bg-muted/20">{children}</tr>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-sm font-medium text-foreground mt-3 mb-1">
        {children}
      </h4>
    ),
    p: ({ children }: any) => (
      <p className="text-muted-foreground mb-3 leading-relaxed text-sm">{children}</p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-outside ml-4 space-y-1 mb-4 text-muted-foreground text-sm">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-outside ml-4 space-y-1 mb-4 text-muted-foreground text-sm">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="text-muted-foreground">{children}</li>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground bg-muted/20 py-2 rounded-r">
        {children}
      </blockquote>
    ),
  };

  // Pre-process markdown to fix common table formatting issues and hide internal markers
  const preprocessMarkdown = (content: string): string => {
    if (!content) return '';
    
    // Remove SKILLS_JSON markers and their content (used for programmatic extraction, not display)
    // Also remove the "Required Skills" heading if it only contains the JSON block
    let processed = content
      .replace(/##\s*Required Skills\s*\n+<!-- SKILLS_JSON_START -->[\s\S]*?<!-- SKILLS_JSON_END -->\s*\n*/gi, '')
      .replace(/<!-- SKILLS_JSON_START -->[\s\S]*?<!-- SKILLS_JSON_END -->/g, '')
      .replace(/\["[^"]+",\s*(?:"[^"]+",?\s*)*\]/g, (match) => {
        // Remove raw JSON arrays that look like skill lists
        if (match.includes('Machine Learning') || match.includes('Python') || match.includes('Product Management')) {
          return '';
        }
        return match;
      });
    
    const lines = processed.split('\n');
    const processedLines: string[] = [];
    let inTable = false;
    let headerLine = '';
    let separatorParts: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('|') && line.endsWith('|') && !line.match(/^[\|\s:\-]+$/)) {
        inTable = true;
        headerLine = line;
        processedLines.push(line);
        separatorParts = [];
        continue;
      }
      
      if (inTable && line.match(/^[\|\s:\-]+$/)) {
        separatorParts.push(line);
        const headerCols = (headerLine.match(/\|/g) || []).length;
        const combinedSeparator = separatorParts.join('');
        const sepCols = (combinedSeparator.match(/\|/g) || []).length;
        
        if (sepCols >= headerCols - 1) {
          const colCount = headerCols - 1;
          const separator = '|' + Array(colCount).fill('---').join('|') + '|';
          processedLines.push(separator);
          separatorParts = [];
        }
        continue;
      }
      
      if (inTable && line.startsWith('|') && line.endsWith('|')) {
        processedLines.push(line);
        continue;
      }
      
      if (inTable && (line === '' || !line.startsWith('|'))) {
        inTable = false;
        headerLine = '';
        separatorParts = [];
      }
      
      processedLines.push(lines[i]);
    }
    
    return processedLines.join('\n');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Yassu Business Plan
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
            Yassu Business Plan
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

  const parsedSections = artifact?.content ? parseSections(artifact.content) : [];

  // Create a lookup for individual section tabs - aggregate all sections with same key
  const sectionLookup: Record<string, { title: string; content: string }[]> = {};
  for (const section of parsedSections) {
    if (!sectionLookup[section.key]) {
      sectionLookup[section.key] = [];
    }
    sectionLookup[section.key].push({ title: section.title, content: section.content });
  }

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
              Yassu Business Plan
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
                  <div className="max-h-[700px] overflow-y-auto space-y-4 pr-2">
                    {parsedSections.map((section, index) => {
                      const Icon = SECTION_ICONS[section.key] || FileText;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="border border-border/50 bg-card/50">
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <div className="p-1.5 rounded-md bg-primary/10">
                                  <Icon className="w-4 h-4 text-primary" />
                                </div>
                                {section.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                  {preprocessMarkdown(section.content)}
                                </ReactMarkdown>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </TabsContent>

                {Object.keys(SECTION_LABELS).map((key) => {
                  const Icon = SECTION_ICONS[key];
                  const sections = sectionLookup[key] || [];
                  return (
                    <TabsContent key={key} value={key} className="mt-0">
                      <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
                        {sections.length > 0 ? (
                          sections.map((section, idx) => (
                            <Card key={idx} className="border border-border/50 bg-card/50">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <div className="p-2 rounded-md bg-primary/10">
                                    <Icon className="w-5 h-5 text-primary" />
                                  </div>
                                  {section.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                    {preprocessMarkdown(section.content)}
                                  </ReactMarkdown>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <Card className="border border-border/50 bg-card/50">
                            <CardHeader className="pb-3">
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="p-2 rounded-md bg-primary/10">
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                {SECTION_LABELS[key]}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-muted-foreground">No {SECTION_LABELS[key]} analysis available.</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                  );
                })}
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
