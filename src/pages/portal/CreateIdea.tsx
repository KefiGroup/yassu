import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
    rawIdea: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.rawIdea.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please provide a title and describe your idea.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    // Save the idea with just the raw description - AI will figure out the rest
    const { data: idea, error } = await supabase
      .from('ideas')
      .insert({
        created_by: user?.id,
        title: formData.title,
        problem: formData.rawIdea, // Store raw idea in problem field initially
        stage: 'concept',
        is_public: true,
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

    // Trigger automatic business plan generation
    toast({
      title: 'Idea saved!',
      description: 'AI is analyzing your idea and generating a complete business plan...',
    });

    // Navigate immediately - business plan generates in background
    navigate(`/portal/ideas/${idea.id}`);

    // Fire and forget - the business plan will be generated in the background
    supabase.functions.invoke('generate-business-plan', {
      body: { ideaId: idea.id, rawIdea: formData.rawIdea },
    }).then(() => {
      console.log('Business plan generation started');
    }).catch((err) => {
      console.error('Business plan generation error:', err);
    });
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
            <p className="text-muted-foreground">Just describe your idea - AI will do the rest</p>
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
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI-Powered Idea Analysis
              </CardTitle>
              <CardDescription>
                Simply describe your idea in your own words. Our AI will analyze it to identify the problem, 
                solution, target market, and generate a complete 8-step business plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Give your idea a name *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Campus Food Delivery, Student Tutoring Marketplace"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Raw Idea */}
              <div className="space-y-2">
                <Label htmlFor="rawIdea">Describe your idea *</Label>
                <Textarea
                  id="rawIdea"
                  placeholder="Just write freely! For example:

'I want to create an app that helps students find study groups. A lot of people struggle to find others to study with, especially in large classes. Maybe it could match people based on their schedule and what they're studying...'

Or even simpler:

'An Uber for tutoring' or 'Instagram for college recipes'

Don't worry about structure - just describe what you're thinking!"
                  value={formData.rawIdea}
                  onChange={(e) => setFormData({ ...formData, rawIdea: e.target.value })}
                  rows={8}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  The more context you provide, the better the AI analysis will be. But even a single sentence works!
                </p>
              </div>

              {/* What AI will do */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">What happens next:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    AI extracts the problem you're solving
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Identifies your solution and target users
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Runs 8 comprehensive workflow analyses
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Generates a complete business plan in ~2 minutes
                  </li>
                </ul>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze & Generate Business Plan
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
