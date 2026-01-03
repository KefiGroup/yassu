import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
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
}

const sectionConfig = [
  { type: 'executive_summary', label: 'Executive Summary', icon: FileText },
  { type: 'founder_fit', label: 'Founder Fit', icon: Lightbulb },
  { type: 'competitive_landscape', label: 'Competitive Landscape', icon: TrendingUp },
  { type: 'risk_and_moat', label: 'Risk & Moat', icon: Target },
  { type: 'mvp_design', label: 'MVP Design', icon: Sparkles },
  { type: 'team_and_talent', label: 'Team & Talent', icon: Users },
  { type: 'launch_plan', label: 'Launch Plan', icon: Rocket },
  { type: 'school_advantage', label: 'School Advantage', icon: GraduationCap },
  { type: 'funding_pitch', label: 'Funding Pitch', icon: DollarSign },
];

export default function MyWorkflows({ ideaId, isOwner, hasBusinessPlan }: MyWorkflowsProps) {
  const { toast } = useToast();
  const [sections, setSections] = useState<WorkflowSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSections() {
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
    }

    if (ideaId) {
      fetchSections();
    }
  }, [ideaId]);

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

  if (!isOwner) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
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
            {sectionConfig.map((config) => {
              const SectionIcon = config.icon;
              const content = getSectionContent(config.type);
              const isEditing = editingSection === config.type;
              const isAiGenerated = isSectionAiGenerated(config.type);

              return (
                <Card key={config.type} className="bg-muted/30" data-testid={`workflow-section-${config.type}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <SectionIcon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{config.label}</span>
                        {isAiGenerated && !isEditing && content && (
                          <Badge variant="secondary" className="text-xs">
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(config.type)}
                          data-testid={`button-edit-${config.type}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
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
                      <div className="text-sm text-muted-foreground">
                        {content ? (
                          <p className="line-clamp-3">{content.substring(0, 200)}...</p>
                        ) : (
                          <p className="italic">No content yet. Click Edit to add your own version.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
