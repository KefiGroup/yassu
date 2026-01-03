import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Lightbulb,
  TrendingUp,
  Target,
  Sparkles,
  Users,
  Rocket,
  GraduationCap,
  DollarSign,
  Loader2,
  Save,
  Edit,
  X,
  Wand2,
  ArrowRight,
  Play,
  RefreshCw,
} from 'lucide-react';

interface WorkflowSection {
  id: string;
  ideaId: string;
  sectionType: string;
  content: string;
  aiGenerated: boolean;
  updatedAt: string;
}

interface MyWorkflowsProps {
  ideaId: string;
  isOwner: boolean;
  hasBusinessPlan: boolean;
  businessPlanSections?: Record<string, string>;
}

const sectionConfig = [
  { 
    type: 'executive_summary', 
    label: 'Executive Summary', 
    icon: FileText,
    description: 'Overview of your business idea, mission, and key objectives.',
    outputs: ['Mission Statement', 'Key Objectives', 'Value Proposition']
  },
  { 
    type: 'founder_fit', 
    label: 'Idea & Founder Fit', 
    icon: Lightbulb,
    description: 'Analyze your alignment with the problem you\'re solving.',
    outputs: ['Problem Statement', 'Founder Motivation', 'Initial Hypothesis']
  },
  { 
    type: 'competitive_landscape', 
    label: 'Competitive Landscape', 
    icon: TrendingUp,
    description: 'Scan the market, identify competitors, and find whitespace.',
    outputs: ['Market Map', 'Competitor Grid', 'Whitespace Analysis']
  },
  { 
    type: 'risk_and_moat', 
    label: 'Risk & Moat Builder', 
    icon: Target,
    description: 'Identify risks, build defensibility, and score your moat.',
    outputs: ['Risk Matrix', 'Moat Score', 'Mitigation Plan']
  },
  { 
    type: 'mvp_design', 
    label: 'Product & MVP Design', 
    icon: Sparkles,
    description: 'Design your product roadmap and feature backlog.',
    outputs: ['Feature List', 'MVP Scope', 'Tech Stack']
  },
  { 
    type: 'team_and_talent', 
    label: 'Team & Talent', 
    icon: Users,
    description: 'Define required skills and team structure.',
    outputs: ['Skills Matrix', 'Team Roles', 'Hiring Plan']
  },
  { 
    type: 'launch_plan', 
    label: 'Launch Strategy', 
    icon: Rocket,
    description: 'Plan your go-to-market and launch timeline.',
    outputs: ['Launch Timeline', 'GTM Strategy', 'Milestones']
  },
  { 
    type: 'school_advantage', 
    label: 'School Advantage', 
    icon: GraduationCap,
    description: 'Leverage university resources and network.',
    outputs: ['Campus Resources', 'Alumni Network', 'Academic Support']
  },
  { 
    type: 'funding_pitch', 
    label: 'Funding Pitch', 
    icon: DollarSign,
    description: 'Prepare your pitch deck and funding strategy.',
    outputs: ['Pitch Summary', 'Financial Ask', 'Use of Funds']
  },
];

export default function MyWorkflows({ ideaId, isOwner, hasBusinessPlan, businessPlanSections }: MyWorkflowsProps) {
  const { toast } = useToast();
  const [sections, setSections] = useState<WorkflowSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [populating, setPopulating] = useState(false);

  const fetchSections = async () => {
    try {
      const response = await fetch(`/api/ideas/${ideaId}/workflows`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (error) {
      console.error('Failed to fetch workflow sections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ideaId) {
      fetchSections();
    }
  }, [ideaId]);

  const handlePopulateFromPlan = async () => {
    if (!businessPlanSections) return;
    
    setPopulating(true);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/workflows/populate`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        await fetchSections();
        toast({
          title: 'Sections populated',
          description: 'Your workflow sections have been populated from the AI business plan.',
        });
      } else {
        throw new Error('Failed to populate');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to populate sections. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPopulating(false);
    }
  };

  const handleEdit = (sectionType: string) => {
    const section = sections.find(s => s.sectionType === sectionType);
    setEditingSection(sectionType);
    setEditContent(section?.content || '');
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditContent('');
  };

  const handleSave = async (sectionType: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/workflows/${sectionType}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editContent }),
      });

      if (response.ok) {
        const updated = await response.json();
        setSections(prev => {
          const exists = prev.find(s => s.sectionType === sectionType);
          if (exists) {
            return prev.map(s => s.sectionType === sectionType ? updated : s);
          }
          return [...prev, updated];
        });
        setEditingSection(null);
        setEditContent('');
        toast({
          title: 'Section saved',
          description: 'Your workflow section has been updated.',
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save section. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getSectionContent = (sectionType: string): string | undefined => {
    return sections.find(s => s.sectionType === sectionType)?.content;
  };

  const isSectionAiGenerated = (sectionType: string): boolean => {
    return sections.find(s => s.sectionType === sectionType)?.aiGenerated || false;
  };

  const hasAnyContent = sections.length > 0;

  if (!isOwner) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>My Workflows</CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize and refine your business plan sections
              </p>
            </div>
          </div>
          {hasBusinessPlan && !hasAnyContent && !loading && (
            <Button
              onClick={handlePopulateFromPlan}
              disabled={populating}
              data-testid="button-populate-workflows"
            >
              {populating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Populating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Populate from Business Plan
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasBusinessPlan ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Generate a business plan first to unlock editable workflows.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mini-Accelerator Suite Header */}
            <Card className="bg-gradient-to-r from-primary/5 to-pink-500/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Mini-Accelerator Suite</h3>
                    <p className="text-sm text-muted-foreground">
                      Each section guides you through structured content. Outputs are saved and can be exported or shared with your team.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Sections Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {sectionConfig.map((config) => {
                const SectionIcon = config.icon;
                const content = getSectionContent(config.type);
                const isEditing = editingSection === config.type;
                const isAiGenerated = isSectionAiGenerated(config.type);
                const hasContent = !!content;

                return (
                  <Card 
                    key={config.type} 
                    className={`relative overflow-visible ${hasContent ? 'border-primary/30' : ''}`}
                    data-testid={`workflow-section-${config.type}`}
                  >
                    <CardContent className="p-5">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <SectionIcon className="w-5 h-5 text-primary" />
                            </div>
                            <span className="font-semibold">{config.label}</span>
                          </div>
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder={`Enter your ${config.label.toLowerCase()} content here...`}
                            className="min-h-[200px] font-mono text-sm"
                            data-testid={`textarea-${config.type}`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Tip: You can use Markdown formatting for headers, lists, and emphasis.
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleSave(config.type)}
                              disabled={saving}
                              data-testid={`button-save-${config.type}`}
                            >
                              {saving ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  Save
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleCancel}
                              disabled={saving}
                              data-testid={`button-cancel-${config.type}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              hasContent 
                                ? 'bg-primary/10' 
                                : 'bg-muted'
                            }`}>
                              <SectionIcon className={`w-5 h-5 ${hasContent ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold">{config.label}</h3>
                                {isAiGenerated && hasContent && (
                                  <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {config.description}
                              </p>
                            </div>
                          </div>
                          
                          {/* Outputs badges */}
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Outputs</p>
                            <div className="flex flex-wrap gap-1.5">
                              {config.outputs.map((output) => (
                                <Badge 
                                  key={output} 
                                  variant="outline" 
                                  className={`text-xs ${hasContent ? 'bg-primary/5 border-primary/30' : ''}`}
                                >
                                  {output}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Content preview or action button */}
                          {hasContent ? (
                            <div className="space-y-3">
                              <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 line-clamp-3">
                                {content.substring(0, 150)}...
                              </div>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => handleEdit(config.type)}
                                data-testid={`button-edit-${config.type}`}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Content
                                <ArrowRight className="w-4 h-4 ml-auto" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="secondary"
                              className="w-full"
                              onClick={() => handleEdit(config.type)}
                              data-testid={`button-start-${config.type}`}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start Workflow
                              <ArrowRight className="w-4 h-4 ml-auto" />
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
