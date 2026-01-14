import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api, apiRequest } from '@/lib/api';

import { AITeamRoleSuggester } from '@/components/portal/AITeamRoleSuggester';
import { ApplicationForm } from '@/components/portal/ApplicationForm';
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
import { Bold, Italic, List, Heading2, Link2, Eye, Code, Globe, Lock } from 'lucide-react';
import { 
  MDXEditor, 
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  tablePlugin,
  linkPlugin,
  linkDialogPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  ListsToggle,
  UndoRedo,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  isPublic: boolean;
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
  { id: 1, title: 'Post Idea', icon: PenLine, description: 'Share your startup idea', segment: 'idea' },
  { id: 2, title: 'Business Plan', icon: Brain, description: 'Generate with Yassu AI', segment: 'businessPlan' },
  { id: 3, title: 'Find Advisors', icon: Users, description: 'Get expert guidance', segment: 'team' },
  { id: 4, title: 'Form Team', icon: Users2, description: 'Build your founding team', segment: 'team' },
  { id: 5, title: 'Build MVP', icon: Wrench, description: 'Develop your product', segment: 'mvp' },
  { id: 6, title: 'Yassu Foundry', icon: Rocket, description: 'Accelerate growth', segment: 'foundry' },
  { id: 7, title: 'Seek Funding / Market Launch', icon: DollarSign, description: 'Go to market', segment: 'funding' },
];

export default function IdeaDetail() {
  const { id: ideaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Segment refs for scroll navigation
  const ideaRef = useRef<HTMLDivElement>(null);
  const businessPlanRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  const mvpRef = useRef<HTMLDivElement>(null);
  const foundryRef = useRef<HTMLDivElement>(null);
  const fundingRef = useRef<HTMLDivElement>(null);
  
  const segmentRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    idea: ideaRef,
    businessPlan: businessPlanRef,
    team: teamRef,
    mvp: mvpRef,
    foundry: foundryRef,
    funding: fundingRef,
  };

  const scrollToSegment = (segment: string) => {
    const ref = segmentRefs[segment];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const [idea, setIdea] = useState<Idea | null>(null);
  const [businessPlan, setBusinessPlan] = useState<BusinessPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);
  const [activeTab, setActiveTab] = useState('executiveSummary');
  const [potentialTeamMembers, setPotentialTeamMembers] = useState<PotentialTeamMember[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PotentialTeamMember | null>(null);
  const [passedMembers, setPassedMembers] = useState<Set<string>>(new Set());
  const [invitingMember, setInvitingMember] = useState<string | null>(null);
  
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editorReady, setEditorReady] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Interest tracking
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [interestStatus, setInterestStatus] = useState<string | null>(null);
  const [interestCount, setInterestCount] = useState({ total_count: 0, pending_count: 0, accepted_count: 0 });
  const [expressingInterest, setExpressingInterest] = useState(false);
  const [applicationFormOpen, setApplicationFormOpen] = useState(false);
  
  // AI Team Role Suggester
  const [showRoleSuggester, setShowRoleSuggester] = useState(false);
  
  // Team for this idea
  const [ideaTeam, setIdeaTeam] = useState<{ id: string; name: string } | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);

  useEffect(() => {
    async function fetchIdea() {
      if (!ideaId) return;

      try {
        const ideaData = await api.ideas.get(ideaId);
        setIdea(ideaData);
        
        // Fetch interest count
        try {
          const countResponse = await fetch(`/api/ideas/${ideaId}/interest-count`);
          if (countResponse.ok) {
            const countData = await countResponse.json();
            setInterestCount(countData);
          }
        } catch (e) {
          console.error('Failed to fetch interest count:', e);
        }
        
        // Check if user has expressed interest
        if (user) {
          try {
            const interestResponse = await fetch(`/api/ideas/${ideaId}/my-interest`);
            if (interestResponse.ok) {
              const interestData = await interestResponse.json();
              setHasExpressedInterest(interestData.hasInterest);
              setInterestStatus(interestData.interest?.status || null);
            }
          } catch (e) {
            console.error('Failed to check interest:', e);
          }
        }
        
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
        
        // Fetch team for this idea
        try {
          const teamResponse = await fetch(`/api/teams/by-idea/${ideaId}`);
          if (teamResponse.ok) {
            const teamData = await teamResponse.json();
            if (teamData.team) {
              setIdeaTeam(teamData.team);
            }
          }
        } catch (e) {
          console.error('Failed to fetch team:', e);
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
        title: '🚀 Generating Business Plan',
        description: 'AI is analyzing your idea and creating a comprehensive plan. This typically takes 1-2 minutes.',
      });
      
      // Poll for completion
      pollForCompletion(result.id);
    } catch (error) {
      console.error('Business plan generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Generation Failed',
        description: `Could not start business plan generation: ${errorMessage}. Please check your internet connection and try again.`,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!idea || !user) return;
    
    setCreatingTeam(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `${idea.title} Team`,
          description: `Team for ${idea.title}`,
          ideaId: idea.id,
        }),
      });
      
      if (response.ok) {
        const newTeam = await response.json();
        setIdeaTeam({ id: newTeam.id, name: newTeam.name });
        toast({
          title: 'Team Created',
          description: 'Your team has been created. You can now invite collaborators and advisors.',
        });
        navigate(`/portal/teams/${newTeam.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create team');
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create team',
        variant: 'destructive',
      });
    } finally {
      setCreatingTeam(false);
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
            description: 'The AI encountered an issue while generating your business plan. This might be due to high demand or a temporary error. Please try again in a moment.',
            variant: 'destructive',
          });
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 4000);
        }
      } catch (error) {
        console.error('Poll error:', error);
        if (attempts >= maxAttempts) {
          setBusinessPlan(prev => prev ? { ...prev, status: 'failed' } : null);
          toast({
            title: 'Generation Timeout',
            description: 'Business plan generation is taking longer than expected. Please try again or contact support if the issue persists.',
            variant: 'destructive',
          });
        }
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
      console.error('Delete idea error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Delete Failed',
        description: `Could not delete the idea: ${errorMessage}. Please try again or contact support if the issue persists.`,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };
  
  const handleTogglePrivacy = async () => {
    if (!ideaId || !idea) return;
    
    setTogglingPrivacy(true);
    try {
      const newIsPublic = !idea.isPublic;
      const updatedIdea = await api.ideas.update(ideaId, { isPublic: newIsPublic });
      setIdea(updatedIdea);
      toast({
        title: newIsPublic ? 'Idea Made Public' : 'Idea Made Private',
        description: newIsPublic 
          ? 'Your idea is now visible in the marketplace.' 
          : 'Your idea is now hidden from the marketplace.',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Could not update privacy settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTogglingPrivacy(false);
    }
  };

  const sectionKeyToDbType: Record<string, string> = {
    executiveSummary: 'executive_summary',
    founderFit: 'founder_fit',
    competitiveLandscape: 'competitive_landscape',
    riskMoat: 'risk_and_moat',
    mvpDesign: 'mvp_design',
    teamTalent: 'team_and_talent',
    launchPlan: 'launch_plan',
    schoolAdvantage: 'school_advantage',
    fundingPitch: 'funding_pitch',
  };

  const handleEditSection = (sectionId: string) => {
    if (!businessPlan?.sections) {
      console.log('[Edit] No business plan sections available');
      return;
    }
    const rawContent = businessPlan.sections[sectionId as keyof typeof businessPlan.sections] || '';
    console.log('[Edit] Section:', sectionId, 'Raw content length:', rawContent.length);
    // Preprocess the markdown to fix any formatting issues before loading into editor
    const processedContent = preprocessMarkdown(rawContent);
    console.log('[Edit] Processed content length:', processedContent.length);
    
    // Reset editor state first
    setEditorReady(false);
    setEditContent(processedContent);
    setPreviewMode(false);
    setEditingSection(sectionId);
    
    // Delay editor mounting until content is set and dialog is rendered
    // The key increment forces MDXEditor to remount with the new content
    setTimeout(() => {
      setEditorKey(prev => prev + 1);
      setEditorReady(true);
    }, 100);
  };
  
  // Helper function to insert markdown formatting at cursor position
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('edit-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editContent.substring(start, end);
    const newText = editContent.substring(0, start) + before + selectedText + after + editContent.substring(end);
    setEditContent(newText);
    
    // Set cursor position after the operation
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleInviteMember = async (member: PotentialTeamMember) => {
    if (!ideaId || !idea) return;
    
    setInvitingMember(member.id);
    try {
      await apiRequest(`/api/team-invites`, {
        method: 'POST',
        body: JSON.stringify({ 
          ideaId, 
          inviteeId: member.userId,
          message: `I'd like to invite you to join my project: ${idea.title}`
        }),
      });
      
      toast({
        title: 'Invitation Sent',
        description: `An invitation has been sent to ${member.fullName || 'the collaborator'}.`,
      });
      
      // Close dialog if open
      setSelectedMember(null);
      
      // Add to passed members so they don't show up in the list anymore
      setPassedMembers(prev => new Set([...prev, member.id]));
    } catch (error) {
      console.error('Invite error:', error);
      toast({
        title: 'Invitation Failed',
        description: 'Could not send invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setInvitingMember(null);
    }
  };

  const handlePassMember = (memberId: string) => {
    setPassedMembers(prev => new Set([...prev, memberId]));
    if (selectedMember?.id === memberId) {
      setSelectedMember(null);
    }
    toast({
      description: 'Collaborator removed from suggestions.',
    });
  };

  const handleSaveSection = async () => {
    if (!editingSection || !ideaId) return;
    
    setSaving(true);
    try {
      const dbSectionType = sectionKeyToDbType[editingSection];
      await apiRequest(`/ideas/${ideaId}/workflows/${dbSectionType}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editContent }),
      });
      
      setBusinessPlan(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: {
            ...prev.sections,
            [editingSection]: editContent,
          },
        };
      });
      
      toast({
        title: 'Section Updated',
        description: 'Your changes have been saved.',
      });
      setEditingSection(null);
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Could not save changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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

  const handleToggleVisibility = async () => {
    if (!ideaId || !idea) return;
    
    setTogglingPrivacy(true);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublic: !idea.isPublic })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update visibility');
      }
      
      const updatedIdea = await response.json();
      setIdea(updatedIdea);
      
      toast({
        title: updatedIdea.isPublic ? '🌍 Idea is now Public' : '🔒 Idea is now Private',
        description: updatedIdea.isPublic 
          ? 'Your idea is now visible in the marketplace to all users.'
          : 'Your idea is now private and only visible to you.',
      });
    } catch (error) {
      console.error('Toggle visibility error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update idea visibility. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTogglingPrivacy(false);
    }
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

  // Pre-process markdown to fix common table formatting issues and hide internal markers
  const preprocessMarkdown = (content: string): string => {
    if (!content) return '';
    
    // Strip code fence wrappers that AI might add (```markdown or ``` at start/end)
    let processed = content
      .replace(/^```(?:markdown|md)?\s*\n?/i, '') // Remove opening code fence
      .replace(/\n?```\s*$/i, ''); // Remove closing code fence
    
    // Remove SKILLS_JSON markers and the entire Required Skills section (used for programmatic extraction, not display)
    processed = processed
      .replace(/##\s*Required Skills[\s\S]*?(?=##|$)/gi, '') // Remove entire Required Skills section
      .replace(/<!-- SKILLS_JSON_START -->[\s\S]*?<!-- SKILLS_JSON_END -->/g, '')
      .replace(/\["[^"]*(?:Machine Learning|Data Science|Python|Product Management)[^"]*"[^\]]*\]/g, ''); // Remove stray JSON arrays
    
    // Fix tables that have broken separator rows (lines with only dashes and pipes)
    // Join separator line fragments back together
    const lines = processed.split('\n');
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
  
  // Debug logging
  console.log('Debug - User ID:', user?.id, 'Idea Creator:', idea.createdBy, 'Match:', isOwner);
  console.log('Debug - User object:', user);
  console.log('Debug - Idea object:', idea);

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
              onClick={handleTogglePrivacy}
              disabled={togglingPrivacy}
              data-testid="button-toggle-privacy"
            >
              {togglingPrivacy ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : idea.isPublic ? (
                <Globe className="w-4 h-4 mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              {idea.isPublic ? 'Public' : 'Private'}
            </Button>
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
            <CardTitle className="text-lg">Your Project Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-center justify-center min-w-max">
                {journeySteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = step.id === 1 || (step.id === 2 && businessPlan?.status === 'completed');
                  const isCurrent = (step.id === 2 && !businessPlan) || 
                    (step.id === 2 && businessPlan?.status === 'running') ||
                    (step.id === 3 && businessPlan?.status === 'completed');
                  
                  return (
                    <div key={step.id} className="flex items-center">
                      <button
                        onClick={() => scrollToSegment(step.segment)}
                        className="flex flex-col items-center gap-1 group cursor-pointer"
                        data-testid={`journey-step-${step.id}`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md ${
                            isCompleted
                              ? 'bg-primary text-primary-foreground'
                              : isCurrent
                              ? 'bg-primary/20 text-primary ring-2 ring-primary'
                              : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <StepIcon className="w-5 h-5" />
                          )}
                        </div>
                        <span className={`text-xs text-center w-20 transition-colors ${
                          isCompleted || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'
                        }`}>
                          {step.title}
                        </span>
                      </button>
                      {index < journeySteps.length - 1 && (
                        <div className={`w-12 h-1 mx-3 rounded-full flex-shrink-0 ${
                          isCompleted ? 'bg-primary' : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>



      {/* SEGMENT: Idea */}
      <motion.div
        ref={ideaRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="scroll-mt-4"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <PenLine className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-semibold text-lg">Idea Overview</h2>
            </div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle className="text-2xl">{idea.title}</CardTitle>
                  <Badge className={stageColors[idea.stage] || stageColors.concept}>
                    {idea.stage}
                  </Badge>
                  {isOwner && (
                    <Button
                      variant={idea.isPublic ? "outline" : "default"}
                      size="sm"
                      onClick={handleToggleVisibility}
                      disabled={togglingPrivacy}
                      className={`gap-2 ${idea.isPublic ? '' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      {togglingPrivacy ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : idea.isPublic ? (
                        <Globe className="w-3 h-3" />
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                      {idea.isPublic ? 'Public' : 'Private'}
                    </Button>
                  )}
                  {!isOwner && !idea.isPublic && (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="w-3 h-3" />
                      Private
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Creator
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(idea.createdAt).toLocaleDateString()}
                  </span>
                  {interestCount.total_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Users2 className="w-4 h-4" />
                      {interestCount.total_count} interested
                    </span>
                  )}
                </div>
              </div>
              
              {/* Express Interest Button - Only show if not creator */}
              {user && idea.createdBy !== user.id && (
                <div>
                  {!hasExpressedInterest ? (
                    <>
                      <Button
                        onClick={() => setApplicationFormOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        <Users2 className="w-4 h-4 mr-2" />
                        Express Interest
                      </Button>
                      
                      <ApplicationForm
                        open={applicationFormOpen}
                        onOpenChange={setApplicationFormOpen}
                        ideaTitle={idea.title}
                        onSubmit={async (application) => {
                          try {
                            const response = await fetch(`/api/ideas/${ideaId}/interest`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(application)
                            });
                            
                            if (response.ok) {
                              setHasExpressedInterest(true);
                              setInterestStatus('pending');
                              toast({
                                title: 'Application Submitted!',
                                description: 'The creator will review your application.'
                              });
                              // Refresh interest count
                              const countResponse = await fetch(`/api/ideas/${ideaId}/interest-count`);
                              if (countResponse.ok) {
                                const countData = await countResponse.json();
                                setInterestCount(countData);
                              }
                            } else {
                              const error = await response.json();
                              toast({
                                title: 'Error',
                                description: error.error || 'Failed to submit application',
                                variant: 'destructive'
                              });
                              throw new Error(error.error);
                            }
                          } catch (error) {
                            console.error('Error submitting application:', error);
                            throw error;
                          }
                        }}
                      />
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Interest {interestStatus === 'accepted' ? 'Accepted' : interestStatus === 'rejected' ? 'Declined' : 'Pending'}
                      </Badge>
                      {interestStatus === 'accepted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/portal/messages')}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message Creator
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
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

      {/* Business Plan Section - Show for owners (always) or public ideas with plan */}
      {/* SEGMENT: Business Plan */}
      {(isOwner || (businessPlan && idea.isPublic)) && (
      <motion.div
        ref={businessPlanRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="scroll-mt-4"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Business Plan
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
                {isOwner && (
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
                )}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  {isOwner && (
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
                  )}
                  
                  {(isOwner ? planSections : planSections.filter(s => s.id === 'executiveSummary')).map((section) => (
                    <TabsContent key={section.id} value={section.id} className="mt-6">
                      <Card className="bg-muted/30">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <section.icon className="w-4 h-4 text-primary" />
                              </div>
                              <h3 className="font-semibold text-lg">{section.label}</h3>
                            </div>
                            {isOwner && businessPlan.sections[section.id as keyof typeof businessPlan.sections] && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSection(section.id)}
                                data-testid={`button-edit-${section.id}`}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            )}
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
                                <h4 className="font-semibold text-lg">Potential collaborators on Yassu</h4>
                              </div>
                              
                              {loadingTeamMembers ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                  <span className="ml-2 text-muted-foreground">Finding matches...</span>
                                </div>
                              ) : potentialTeamMembers.filter(m => !passedMembers.has(m.id)).length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                  {potentialTeamMembers.filter(m => !passedMembers.has(m.id)).map((member) => (
                                    <Card 
                                      key={member.id} 
                                      className="hover-elevate cursor-pointer group relative" 
                                      data-testid={`card-team-member-${member.id}`}
                                      onClick={() => setSelectedMember(member)}
                                    >
                                      <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                          <Avatar className="w-12 h-12">
                                            <AvatarImage src={member.avatarUrl || undefined} />
                                            <AvatarFallback>
                                              {member.fullName?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                              <p className="font-medium truncate group-hover:text-primary transition-colors">
                                                {member.fullName || 'Anonymous'}
                                              </p>
                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePassMember(member.id);
                                                  }}
                                                  title="Pass"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </div>
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
                                            <div className="mt-3 flex gap-2">
                                              <Button 
                                                size="sm" 
                                                className="w-full h-8 text-xs"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleInviteMember(member);
                                                }}
                                                disabled={invitingMember === member.id}
                                              >
                                                {invitingMember === member.id ? (
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                  <>
                                                    <Send className="w-3 h-3 mr-1" />
                                                    Invite
                                                  </>
                                                )}
                                              </Button>
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
                                  <p>No matching collaborators found yet.</p>
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
      )}

      {/* SEGMENT: Team */}
      <motion.div
        ref={teamRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="scroll-mt-4"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Users2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <p className="text-sm text-muted-foreground">Build your founding team</p>
                </div>
              </div>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRoleSuggester(true)}
                  data-testid="button-find-team-members"
                >
                  <Users2 className="w-4 h-4 mr-2" />
                  Find Team Members
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {ideaTeam ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{ideaTeam.name}</h3>
                <p className="text-muted-foreground mb-4">
                  Manage your team, find advisors, and invite collaborators.
                </p>
                <Button 
                  onClick={() => navigate(`/portal/teams/${ideaTeam.id}`)}
                  data-testid="button-go-to-team"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Go to My Team
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No Team Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a team for this project to start inviting collaborators and advisors.
                </p>
                {isOwner && (
                  <Button 
                    onClick={handleCreateTeam}
                    disabled={creatingTeam}
                    data-testid="button-create-team"
                  >
                    {creatingTeam ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4 mr-2" />
                    )}
                    {creatingTeam ? 'Creating Team...' : 'Create Team'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* SEGMENT: MVP */}
      <motion.div
        ref={mvpRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="scroll-mt-4"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>MVP Development</CardTitle>
                <p className="text-sm text-muted-foreground">Build your minimum viable product</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  How It Works
                </h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li><strong>Plan your MVP</strong> - Use our AI-powered MVP Builder to define features, tech stack, and specifications</li>
                  <li><strong>Build with Manus AI</strong> - Take your specifications to Manus AI to actually build and deploy your product</li>
                </ol>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-2">Step 1: Plan Your MVP</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Chat with AI to define features, user stories, database schema, and development roadmap.
                    </p>
                    <Button
                      onClick={() => navigate(`/portal/mvp-builder?ideaId=${idea?.id}`)}
                      variant="outline"
                      className="w-full"
                      data-testid="button-mvp-builder-main"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Open MVP Builder
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-3">
                      <Code className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-2">Step 2: Build It</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Take your MVP specifications to Manus AI to build and deploy your actual product.
                    </p>
                    <Button
                      onClick={async () => {
                        if (!idea) return;
                        try {
                          await apiRequest('/api/referrals/track', {
                            method: 'POST',
                            body: JSON.stringify({
                              platform: 'manus',
                              ideaId: idea.id,
                              ideaTitle: idea.title,
                            }),
                          });
                        } catch (e) {
                          console.error('Failed to track referral:', e);
                        }
                        const context = {
                          source: 'yassu',
                          ref: user?.email || 'yassu-platform',
                          project: idea.title,
                          problem: idea.problem,
                          solution: idea.solution || '',
                          users: idea.targetUser || '',
                        };
                        const manusUrl = `https://manus.im?${new URLSearchParams(context).toString()}`;
                        window.open(manusUrl, '_blank');
                      }}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                      data-testid="button-build-mvp-manus"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      Build with Manus AI
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* SEGMENT: Yassu Foundry - Placeholder for future */}
      <motion.div
        ref={foundryRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.38 }}
        className="scroll-mt-4"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Yassu Foundry</CardTitle>
                <p className="text-sm text-muted-foreground">Accelerate your startup growth</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                The Yassu Foundry program will provide mentorship, resources, and support to help you scale your startup.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* SEGMENT: Launch / Funding */}
      <motion.div
        ref={fundingRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="scroll-mt-4"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Funding & Pitch Deck</CardTitle>
                <p className="text-sm text-muted-foreground">Prepare for fundraising</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  How It Works
                </h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li><strong>Generate your deck</strong> - Use our AI to create 10 professional slides with content and speaker notes</li>
                  <li><strong>Refine each slide</strong> - Chat with AI to improve specific slides before presenting</li>
                  <li><strong>Build with Manus AI</strong> - Create a polished presentation file with Manus</li>
                </ol>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-2">Step 1: Generate & Refine</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      AI creates 10 investor-ready slides. Refine each slide with chat.
                    </p>
                    <Button
                      onClick={() => navigate(`/portal/pitch-deck?ideaId=${idea?.id}`)}
                      variant="outline"
                      className="w-full"
                      data-testid="button-pitch-deck-generator"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Open Pitch Deck Generator
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3">
                      <Presentation className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-2">Step 2: Build Presentation</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a polished slide deck file ready for investor meetings.
                    </p>
                    <Button
                      onClick={async () => {
                        if (!idea) return;
                        try {
                          await apiRequest('/api/referrals/track', {
                            method: 'POST',
                            body: JSON.stringify({
                              platform: 'manus',
                              ideaId: idea.id,
                              ideaTitle: idea.title,
                              actionType: 'pitch_deck',
                            }),
                          });
                        } catch (e) {
                          console.error('Failed to track referral:', e);
                        }
                        const fundingPitch = businessPlan?.sections?.fundingPitch || '';
                        const context = {
                          source: 'yassu',
                          ref: user?.email || 'yassu-platform',
                          project: idea.title,
                          task: 'Create a professional pitch deck presentation',
                          problem: idea.problem,
                          solution: idea.solution || '',
                          users: idea.targetUser || '',
                          funding_strategy: fundingPitch.substring(0, 500),
                        };
                        const manusUrl = `https://manus.im?${new URLSearchParams(context).toString()}`;
                        window.open(manusUrl, '_blank');
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                      data-testid="button-build-pitch-deck-manus"
                    >
                      <Presentation className="w-4 h-4 mr-2" />
                      Build with Manus AI
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {businessPlan?.sections?.fundingPitch && (
              <div className="mt-6 pt-6 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-500 text-white">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Funding Strategy Ready
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab('fundingPitch');
                      scrollToSegment('businessPlan');
                    }}
                    data-testid="button-view-funding-pitch"
                  >
                    View in Business Plan
                  </Button>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 p-4 rounded-lg max-h-48 overflow-hidden relative">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {preprocessMarkdown(businessPlan.sections.fundingPitch)}
                  </ReactMarkdown>
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted/80 to-transparent pointer-events-none" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit {planSections.find(s => s.id === editingSection)?.label || 'Section'}
            </DialogTitle>
            <DialogDescription>
              Edit your content below. Use the formatting buttons or switch to Preview to see the result.
            </DialogDescription>
          </DialogHeader>
          
          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1 p-2 border rounded-lg bg-muted/30 flex-wrap">
            <Button
              type="button"
              size="icon"
              variant={previewMode ? "ghost" : "secondary"}
              onClick={() => setPreviewMode(false)}
              title="Edit"
              data-testid="button-edit-mode"
            >
              <Code className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={previewMode ? "secondary" : "ghost"}
              onClick={() => setPreviewMode(true)}
              title="Preview"
              data-testid="button-preview-mode"
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6 mx-2" />
            
            {!previewMode && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => insertMarkdown('**', '**')}
                  title="Bold"
                  data-testid="button-format-bold"
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => insertMarkdown('*', '*')}
                  title="Italic"
                  data-testid="button-format-italic"
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => insertMarkdown('## ', '')}
                  title="Heading"
                  data-testid="button-format-heading"
                >
                  <Heading2 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => insertMarkdown('- ', '')}
                  title="Bullet List"
                  data-testid="button-format-list"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => insertMarkdown('[', '](url)')}
                  title="Link"
                  data-testid="button-format-link"
                >
                  <Link2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
          
          {/* Editor / Preview Area */}
          <div className="flex-1 overflow-auto min-h-0 border rounded-lg bg-background">
            {previewMode ? (
              <div className="p-4 prose prose-sm dark:prose-invert max-w-none min-h-[400px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editContent || '*No content yet*'}
                </ReactMarkdown>
              </div>
            ) : editorReady && editContent ? (
              <MDXEditor
                key={editorKey}
                markdown={editContent}
                onChange={(value) => setEditContent(value || '')}
                className="min-h-[450px]"
                contentEditableClassName="p-4 min-h-[400px] outline-none prose prose-sm dark:prose-invert max-w-none"
                plugins={[
                  headingsPlugin(),
                  listsPlugin(),
                  quotePlugin(),
                  thematicBreakPlugin(),
                  markdownShortcutPlugin(),
                  tablePlugin(),
                  linkPlugin(),
                  linkDialogPlugin(),
                  toolbarPlugin({
                    toolbarContents: () => (
                      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
                        <UndoRedo />
                        <BlockTypeSelect />
                        <BoldItalicUnderlineToggles />
                        <ListsToggle />
                        <CreateLink />
                        <InsertTable />
                      </div>
                    ),
                  }),
                ]}
              />
            ) : !editorReady ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Textarea
                id="edit-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[400px] h-[400px] resize-none border-0 focus-visible:ring-0 font-mono text-sm"
                placeholder="Enter your content here using Markdown formatting..."
                data-testid="textarea-edit-content"
              />
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingSection(null)}
              disabled={saving}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSection}
              disabled={saving}
              data-testid="button-save-section"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Detail Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Collaborator Profile</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={selectedMember.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl">
                    {selectedMember.fullName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedMember.fullName || 'Anonymous'}</h3>
                  <p className="text-muted-foreground">{selectedMember.headline || 'Yassu Collaborator'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {selectedMember.matchCount} skill{selectedMember.matchCount !== 1 ? 's' : ''} match
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Matching Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMember.matchingSkills.map((skill) => (
                    <Badge key={skill} variant="outline" className="bg-primary/5">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  All Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMember.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handlePassMember(selectedMember.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Pass
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => handleInviteMember(selectedMember)}
                  disabled={invitingMember === selectedMember.id}
                >
                  {invitingMember === selectedMember.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Invite to Project
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Team Role Suggester Modal */}
      {idea && (
        <AITeamRoleSuggester
          open={showRoleSuggester}
          onOpenChange={setShowRoleSuggester}
          ideaData={{
            title: idea.title,
            problem: idea.problem,
            solution: idea.solution,
            targetUser: idea.targetUser,
            stage: idea.stage,
            desiredTeammates: idea.desiredTeammates,
          }}
          onRoleSelected={(role) => {
            // Navigate to collaborators marketplace with role filter
            navigate(`/portal/collaborators?role=${encodeURIComponent(role)}`);
          }}
        />
      )}
    </div>
  );
}
