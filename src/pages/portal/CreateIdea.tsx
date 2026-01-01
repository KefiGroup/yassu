import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, X, Save } from 'lucide-react';

export default function CreateIdea() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    problem: '',
    solution: '',
    target_user: '',
    why_now: '',
    assumptions: '',
    desired_teammates: '',
    expected_timeline: '',
    stage: 'concept',
    is_public: true,
    tags: [] as string[],
  });

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.problem.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please provide at least a title and problem statement.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const { data: idea, error } = await supabase
      .from('ideas')
      .insert({
        created_by: user?.id,
        title: formData.title,
        problem: formData.problem,
        solution: formData.solution || null,
        target_user: formData.target_user || null,
        why_now: formData.why_now || null,
        assumptions: formData.assumptions || null,
        desired_teammates: formData.desired_teammates || null,
        expected_timeline: formData.expected_timeline || null,
        stage: formData.stage as 'concept' | 'validating' | 'building' | 'launched',
        is_public: formData.is_public,
      })
      .select()
      .single();

    if (error) {
      setSaving(false);
      toast({
        title: 'Error creating idea',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Add tags
    if (idea && formData.tags.length > 0) {
      await supabase.from('idea_tags').insert(
        formData.tags.map((tag) => ({
          idea_id: idea.id,
          tag,
        }))
      );
    }

    // Trigger automatic business plan generation
    toast({
      title: 'Idea posted!',
      description: 'Generating your AI business plan... This may take a minute.',
    });

    // Fire and forget - the business plan will be generated in the background
    supabase.functions.invoke('generate-business-plan', {
      body: { ideaId: idea.id },
    }).then(() => {
      console.log('Business plan generation started');
    }).catch((err) => {
      console.error('Business plan generation error:', err);
    });

    setSaving(false);
    navigate(`/portal/ideas/${idea.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => navigate('/portal/ideas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Post an Idea</h1>
            <p className="text-muted-foreground">Share your startup concept with the community</p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Idea Details</CardTitle>
              <CardDescription>
                The more detail you provide, the better teammates you'll attract
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="A catchy name for your idea"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Problem */}
              <div className="space-y-2">
                <Label htmlFor="problem">Problem *</Label>
                <Textarea
                  id="problem"
                  placeholder="What problem are you solving? Who has this problem and how painful is it?"
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              {/* Solution */}
              <div className="space-y-2">
                <Label htmlFor="solution">Proposed Solution</Label>
                <Textarea
                  id="solution"
                  placeholder="How do you plan to solve this problem?"
                  value={formData.solution}
                  onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Target User */}
              <div className="space-y-2">
                <Label htmlFor="target_user">Target User</Label>
                <Input
                  id="target_user"
                  placeholder="Who is your ideal first user?"
                  value={formData.target_user}
                  onChange={(e) => setFormData({ ...formData, target_user: e.target.value })}
                />
              </div>

              {/* Why Now */}
              <div className="space-y-2">
                <Label htmlFor="why_now">Why Now?</Label>
                <Textarea
                  id="why_now"
                  placeholder="Why is this the right time to build this?"
                  value={formData.why_now}
                  onChange={(e) => setFormData({ ...formData, why_now: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Assumptions */}
              <div className="space-y-2">
                <Label htmlFor="assumptions">Key Assumptions</Label>
                <Textarea
                  id="assumptions"
                  placeholder="What assumptions are you making that need to be validated?"
                  value={formData.assumptions}
                  onChange={(e) => setFormData({ ...formData, assumptions: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Desired Teammates */}
              <div className="space-y-2">
                <Label htmlFor="desired_teammates">Desired Teammates</Label>
                <Textarea
                  id="desired_teammates"
                  placeholder="What kind of people are you looking for? Skills, experience, availability..."
                  value={formData.desired_teammates}
                  onChange={(e) => setFormData({ ...formData, desired_teammates: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <Label htmlFor="expected_timeline">Expected Timeline</Label>
                <Input
                  id="expected_timeline"
                  placeholder="e.g., MVP in 3 months"
                  value={formData.expected_timeline}
                  onChange={(e) => setFormData({ ...formData, expected_timeline: e.target.value })}
                />
              </div>

              {/* Stage */}
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concept">Concept</SelectItem>
                    <SelectItem value="validating">Validating</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                    <SelectItem value="launched">Launched</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value === 'other') {
                        const customTag = prompt('Enter custom tag:');
                        if (customTag?.trim() && !formData.tags.includes(customTag.trim())) {
                          setFormData({ ...formData, tags: [...formData.tags, customTag.trim()] });
                        }
                      } else if (value && !formData.tags.includes(value)) {
                        setFormData({ ...formData, tags: [...formData.tags, value] });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AI/ML">AI/ML</SelectItem>
                      <SelectItem value="Fintech">Fintech</SelectItem>
                      <SelectItem value="HealthTech">HealthTech</SelectItem>
                      <SelectItem value="EdTech">EdTech</SelectItem>
                      <SelectItem value="B2B">B2B</SelectItem>
                      <SelectItem value="B2C">B2C</SelectItem>
                      <SelectItem value="SaaS">SaaS</SelectItem>
                      <SelectItem value="Marketplace">Marketplace</SelectItem>
                      <SelectItem value="Social">Social</SelectItem>
                      <SelectItem value="Climate">Climate</SelectItem>
                      <SelectItem value="Hardware">Hardware</SelectItem>
                      <SelectItem value="Web3">Web3</SelectItem>
                      <SelectItem value="other">Other...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" disabled={saving}>
                {saving ? (
                  'Posting...'
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Post Idea
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </div>
  );
}
