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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  PenLine,
  Brain,
  UserCheck,
  Users2,
  Wrench,
  Presentation,
  TrendingUp as Funding,
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
import { SKILL_OPTIONS } from '@/lib/profileOptions';

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

interface PotentialTeamMember {
  id: string;
  userId: number;
  fullName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  skills: string[];
  matchingSkills: string[];
  matchCount: number;
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

const journeySteps = [
  { id: 1, title: 'Post Idea', icon: PenLine, description: 'Share your startup idea' },
  { id: 2, title: 'Business Plan', icon: Brain, description: 'Generate with Yassu AI' },
  { id: 3, title: 'Find Advisors', icon: UserCheck, description: 'Connect with advisors & ambassadors' },
  { id: 4, title: 'Form Team', icon: Users2, description: 'Build your founding team' },
  { id: 5, title: 'Build MVP', icon: Wrench, description: 'Develop your product' },
  { id: 6, title: 'Yassu Foundry', icon: Presentation, description: 'Present your progress' },
  { id: 7, title: 'Launch', icon: Rocket, description: 'Funding or market launch' },
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
  const [potentialTeamMembers, setPotentialTeamMembers] = useState<PotentialTeamMember[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

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

  // Helper to strip markdown formatting from skill names
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold: **text**
      .replace(/\*([^*]+)\*/g, '$1')     // Italic: *text*
      .replace(/`([^`]+)`/g, '$1')       // Code: `text`
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links: [text](url)
      .replace(/\(.*?\)/g, '')           // Remove parenthetical notes
      .trim();
  };

  // Fetch potential team members when Team & Talent section is available
  useEffect(() => {
    async function fetchPotentialTeamMembers() {
      if (!businessPlan?.sections?.teamTalent) {
        setPotentialTeamMembers([]);
        return;
      }
      
      setLoadingTeamMembers(true);
      try {
        const teamTalentContent = businessPlan.sections.teamTalent;
        
        // Create lowercase skill lookup for case-insensitive matching
        const skillLookup = new Map(SKILL_OPTIONS.map(s => [s.toLowerCase(), s]));
        
        // Extract skills from SKILLS_JSON markers
        const skillsMatch = teamTalentContent.match(/<!-- SKILLS_JSON_START -->\s*([\s\S]*?)\s*<!-- SKILLS_JSON_END -->/);
        
        let candidateSkills: string[] = [];
        
        if (skillsMatch && skillsMatch[1]) {
          // Parse comma-separated skills from the JSON marker section
          const skillsText = skillsMatch[1].trim();
          // Skip if it looks like instructional text
          if (!skillsText.startsWith('[List') && !skillsText.includes('e.g.')) {
            candidateSkills = skillsText
              .split(',')
              .map(s => stripMarkdown(s.replace(/^["']|["']$/g, ''))) // Remove quotes and markdown
              .filter(s => s.length > 1 && s.length < 50);
          }
        }
        
        // Fallback: Try to find skills from table's first column if markers failed
        if (candidateSkills.length === 0) {
          // Look for table rows and extract first column (skill name)
          const tableRows = teamTalentContent.match(/^\|\s*([^|]+)\s*\|[^|]+\|[^|]+\|[^|]+\|$/gm) || [];
          for (const row of tableRows) {
            const firstCellMatch = row.match(/^\|\s*([^|]+?)\s*\|/);
            if (firstCellMatch && firstCellMatch[1]) {
              const skill = stripMarkdown(firstCellMatch[1]);
              // Skip header row indicators
              if (!skill.includes('---') && skill.toLowerCase() !== 'skill' && !skill.startsWith('[')) {
                candidateSkills.push(skill);
              }
            }
          }
        }
        
        // Validate against platform taxonomy (case-insensitive)
        const validatedSkills = candidateSkills
          .map(s => skillLookup.get(s.toLowerCase()))
          .filter((s): s is string => s !== undefined);
        
        // Dedupe
        const uniqueSkills = [...new Set(validatedSkills)];
        
        console.log('[TeamMatching] Extracted skills:', candidateSkills, 'Validated:', uniqueSkills);
        
        if (uniqueSkills.length > 0) {
          const members = await api.profiles.matchSkills(uniqueSkills);
          setPotentialTeamMembers(members);
        } else {
          setPotentialTeamMembers([]);
        }
      } catch (error) {
        console.error('Failed to fetch potential team members:', error);
        setPotentialTeamMembers([]);
      } finally {
        setLoadingTeamMembers(false);
      }
    }
    
    fetchPotentialTeamMembers();
  }, [businessPlan?.sections?.teamTalent]);

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

  const handleDownloadWord = () => {
    if (!businessPlan?.sections || !idea) return;

    const convertMarkdownToHtml = (md: string): string => {
      return md
        .replace(/^### (.*?)$/gm, '<h3 style="font-size:14pt;font-weight:bold;margin-top:12pt;margin-bottom:6pt;">$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2 style="font-size:16pt;font-weight:bold;margin-top:16pt;margin-bottom:8pt;">$1</h2>')
        .replace(/^# (.*?)$/gm, '<h1 style="font-size:18pt;font-weight:bold;margin-top:20pt;margin-bottom:10pt;">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\s*[-*]\s+(.*)$/gm, '<li style="margin-left:20pt;margin-bottom:4pt;">$1</li>')
        .replace(/(<li.*?<\/li>\n?)+/g, '<ul style="margin:8pt 0;">$&</ul>')
        .replace(/\|(.+)\|/g, (match) => {
          const cells = match.split('|').filter(c => c.trim());
          if (cells.some(c => c.match(/^[-:]+$/))) return '';
          const isHeader = match.includes('---') ? false : true;
          const cellHtml = cells.map(c => 
            `<td style="border:1px solid #ccc;padding:8px;">${c.trim()}</td>`
          ).join('');
          return `<tr>${cellHtml}</tr>`;
        })
        .replace(/(<tr>.*<\/tr>\n?)+/g, '<table style="border-collapse:collapse;width:100%;margin:12pt 0;">$&</table>')
        .replace(/\n\n/g, '</p><p style="margin-bottom:8pt;">')
        .replace(/\n/g, '<br/>');
    };

    const sections = businessPlan.sections;
    const sectionOrder = [
      { key: 'executiveSummary', title: 'Executive Summary' },
      { key: 'founderFit', title: 'Idea-Founder Fit' },
      { key: 'competitiveLandscape', title: 'Competitive Landscape' },
      { key: 'riskMoat', title: 'Risk & Moat Analysis' },
      { key: 'mvpDesign', title: 'MVP Design' },
      { key: 'teamTalent', title: 'Team & Talent Strategy' },
      { key: 'launchPlan', title: 'Go-to-Market Launch' },
      { key: 'schoolAdvantage', title: 'University Advantage' },
      { key: 'fundingPitch', title: 'Funding & Pitch Strategy' },
    ];

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${idea.title} - Business Plan</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; max-width: 800px; margin: 40px auto; padding: 20px; }
  h1 { font-size: 24pt; color: #1a1a1a; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
  h2 { font-size: 16pt; color: #374151; margin-top: 24pt; }
  h3 { font-size: 14pt; color: #4b5563; margin-top: 16pt; }
  table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
  th { background-color: #f3f4f6; font-weight: bold; }
  tr:nth-child(even) { background-color: #f9fafb; }
  ul, ol { margin-left: 20pt; }
  li { margin-bottom: 4pt; }
  .section { page-break-inside: avoid; margin-bottom: 24pt; }
  .header { text-align: center; margin-bottom: 40pt; }
  .subtitle { color: #6b7280; font-size: 12pt; }
</style>
</head>
<body>
<div class="header">
  <h1>${idea.title}</h1>
  <p class="subtitle">Business Plan generated by Yassu</p>
  <p class="subtitle">${new Date().toLocaleDateString()}</p>
</div>
`;

    for (const { key, title } of sectionOrder) {
      const content = sections[key as keyof typeof sections];
      if (content) {
        htmlContent += `
<div class="section">
  <h2>${title}</h2>
  <p>${convertMarkdownToHtml(content)}</p>
</div>
`;
      }
    }

    htmlContent += '</body></html>';

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${idea.title.replace(/[^a-zA-Z0-9]/g, '_')}_Business_Plan.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download Started',
      description: 'Your business plan is being downloaded as a Word document.',
    });
  };

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
    h1: ({ children }: any) => (
      <h1 className="text-xl font-bold text-foreground mt-6 mb-3">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-lg font-semibold text-foreground mt-5 mb-2">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-sm font-medium text-foreground mt-3 mb-1">{children}</h4>
    ),
    p: ({ children }: any) => (
      <p className="text-muted-foreground mb-3 leading-relaxed">{children}</p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-outside ml-5 space-y-1 mb-4 text-muted-foreground">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-outside ml-5 space-y-1 mb-4 text-muted-foreground">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="text-muted-foreground">{children}</li>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic">{children}</em>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground bg-muted/20 py-2 rounded-r">
        {children}
      </blockquote>
    ),
    code: ({ children }: any) => (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
    ),
    pre: ({ children }: any) => (
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4 text-sm">{children}</pre>
    ),
  };

  // Pre-process markdown to fix common table formatting issues
  const preprocessMarkdown = (content: string): string => {
    if (!content) return '';
    
    // Fix tables that have broken separator rows (lines with only dashes and pipes)
    // Join separator line fragments back together
    const lines = content.split('\n');
    const processedLines: string[] = [];
    let inTable = false;
    let headerLine = '';
    let separatorParts: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a table header line (starts and ends with |, contains text)
      if (line.startsWith('|') && line.endsWith('|') && !line.match(/^[\|\s:\-]+$/)) {
        inTable = true;
        headerLine = line;
        processedLines.push(line);
        separatorParts = [];
        continue;
      }
      
      // Check if this is a separator line or part of one
      if (inTable && line.match(/^[\|\s:\-]+$/)) {
        separatorParts.push(line);
        // Check if we have a complete separator (matches header column count)
        const headerCols = (headerLine.match(/\|/g) || []).length;
        const combinedSeparator = separatorParts.join('');
        const sepCols = (combinedSeparator.match(/\|/g) || []).length;
        
        if (sepCols >= headerCols - 1) {
          // Reconstruct proper separator
          const colCount = headerCols - 1;
          const separator = '|' + Array(colCount).fill('---').join('|') + '|';
          processedLines.push(separator);
          separatorParts = [];
        }
        continue;
      }
      
      // Check if this is a table data row
      if (inTable && line.startsWith('|') && line.endsWith('|')) {
        processedLines.push(line);
        continue;
      }
      
      // Exit table mode on empty line or non-table content
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

      {/* Journey Progress Tracker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Yassu Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
              {journeySteps.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = step.id === 1 || (step.id === 2 && businessPlan?.status === 'completed');
                const isCurrent = (step.id === 2 && !businessPlan) || 
                  (step.id === 2 && businessPlan?.status === 'running') ||
                  (step.id === 3 && businessPlan?.status === 'completed');
                
                return (
                  <div key={step.id} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          isCompleted
                            ? 'bg-primary text-primary-foreground'
                            : isCurrent
                            ? 'bg-primary/20 text-primary ring-2 ring-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                        data-testid={`journey-step-${step.id}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <StepIcon className="w-5 h-5" />
                        )}
                      </div>
                      <span className={`text-xs text-center max-w-[70px] ${
                        isCompleted || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    {index < journeySteps.length - 1 && (
                      <div className={`w-6 h-0.5 mx-1 ${
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
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
        transition={{ duration: 0.4, delay: 0.25 }}
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
                    Yassu Business Plan
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
                <h3 className="font-semibold text-lg mb-2">Generate Yassu Business Plan</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Yassu AI will analyze your idea and generate a comprehensive business plan
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
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadWord}
                    data-testid="button-download-plan"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Word Document
                  </Button>
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="bg-muted/50 p-2 rounded-lg mb-4">
                    <div className="flex flex-wrap gap-1">
                      {planSections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setActiveTab(section.id)}
                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                            activeTab === section.id
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-background/50'
                          }`}
                          data-testid={`tab-${section.id}`}
                        >
                          <section.icon className="w-4 h-4 mr-1.5" />
                          {section.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
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
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                              >
                                {preprocessMarkdown(businessPlan.sections[section.id as keyof typeof businessPlan.sections] || '')}
                              </ReactMarkdown>
                            ) : (
                              <p className="text-muted-foreground italic">
                                This section is not available.
                              </p>
                            )}
                          </div>
                          
                          {section.id === 'teamTalent' && (
                            <div className="mt-8 pt-6 border-t">
                              <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-primary" />
                                <h4 className="font-semibold text-lg">Potential Co-Founders on Yassu</h4>
                              </div>
                              
                              {loadingTeamMembers ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                  <span className="ml-2 text-muted-foreground">Finding matches...</span>
                                </div>
                              ) : potentialTeamMembers.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                  {potentialTeamMembers.map((member) => (
                                    <Card key={member.id} className="hover-elevate" data-testid={`card-team-member-${member.id}`}>
                                      <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                          <Avatar className="w-12 h-12">
                                            <AvatarImage src={member.avatarUrl || undefined} />
                                            <AvatarFallback>
                                              {member.fullName?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{member.fullName || 'Anonymous'}</p>
                                            {member.headline && (
                                              <p className="text-sm text-muted-foreground truncate">{member.headline}</p>
                                            )}
                                            <div className="flex items-center gap-1 mt-2">
                                              <Badge variant="secondary" className="text-xs">
                                                {member.matchCount} skill{member.matchCount !== 1 ? 's' : ''} match
                                              </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {member.matchingSkills.slice(0, 3).map((skill) => (
                                                <Badge key={skill} variant="outline" className="text-xs bg-primary/5">
                                                  {skill}
                                                </Badge>
                                              ))}
                                              {member.matchingSkills.length > 3 && (
                                                <Badge variant="outline" className="text-xs">
                                                  +{member.matchingSkills.length - 3} more
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p>No matching co-founders found yet.</p>
                                  <p className="text-sm mt-1">Invite people to join Yassu to grow your network!</p>
                                </div>
                              )}
                            </div>
                          )}
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
