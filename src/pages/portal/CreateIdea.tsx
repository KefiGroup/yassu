import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, Sparkles, Loader2 } from 'lucide-react';

export default function CreateIdea() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    idea: '',
    problem: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to create an idea.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title.trim() || !formData.idea.trim() || !formData.problem.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in the idea name, what your idea is, and what problem it solves.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const idea = await api.ideas.create({
        title: formData.title,
        problem: formData.problem,
        solution: formData.idea,
        stage: 'idea_posted',
        isPublic: true,
      });

      toast({
        title: 'Idea saved!',
        description: 'Your idea has been created successfully.',
      });

      navigate(`/portal/ideas/${idea.id}`);
    } catch (error) {
      setSaving(false);
      toast({
        title: 'Error creating idea',
        description: error instanceof Error ? error.message : 'Failed to create idea',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => navigate('/portal/ideas')} data-testid="button-back">
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                New Idea
              </CardTitle>
              <CardDescription>
                Describe your idea to share it with other founders and potential teammates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Give your idea a name *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Campus Food Delivery, Student Tutoring Marketplace"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="input-idea-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idea">What is your idea? *</Label>
                <Textarea
                  id="idea"
                  placeholder="e.g., An app that helps students find study groups based on their schedule and courses"
                  value={formData.idea}
                  onChange={(e) => setFormData({ ...formData, idea: e.target.value })}
                  rows={3}
                  required
                  className="resize-none"
                  data-testid="input-idea-solution"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problem">What problem does it solve? *</Label>
                <Textarea
                  id="problem"
                  placeholder="e.g., Students struggle to find others to study with, especially in large classes where they don't know anyone"
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  rows={3}
                  required
                  className="resize-none"
                  data-testid="input-idea-problem"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Describe your idea (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add any additional details, context, or thoughts about your idea..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="resize-none"
                  data-testid="input-idea-description"
                />
                <p className="text-xs text-muted-foreground">
                  The more context you provide, the better for potential teammates.
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={saving} data-testid="button-submit-idea">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
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
