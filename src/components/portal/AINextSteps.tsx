import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  Users,
  Target,
  TrendingUp,
  Lightbulb,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface NextStep {
  id: string;
  title: string;
  description: string;
  category: 'validation' | 'team' | 'product' | 'market' | 'funding';
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  estimatedTime?: string;
}

interface AINextStepsProps {
  ideaId: string;
  ideaData: {
    title: string;
    problem: string;
    solution: string | null;
    targetUser: string | null;
    stage: string;
    desiredTeammates: string | null;
  };
}

const categoryIcons = {
  validation: Target,
  team: Users,
  product: Lightbulb,
  market: TrendingUp,
  funding: FileText,
};

const categoryColors = {
  validation: 'bg-blue-100 text-blue-700 border-blue-200',
  team: 'bg-purple-100 text-purple-700 border-purple-200',
  product: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  market: 'bg-green-100 text-green-700 border-green-200',
  funding: 'bg-orange-100 text-orange-700 border-orange-200',
};

const priorityColors = {
  high: 'border-l-4 border-l-red-500',
  medium: 'border-l-4 border-l-yellow-500',
  low: 'border-l-4 border-l-green-500',
};

export function AINextSteps({ ideaId, ideaData }: AINextStepsProps) {
  const [steps, setSteps] = useState<NextStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadNextSteps();
  }, [ideaId]);

  const loadNextSteps = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/ideas/${ideaId}/next-steps`);
      setSteps(response.data.steps);
    } catch (error) {
      console.error('Failed to load next steps:', error);
      // Fallback to client-side generation if API fails
      setSteps(generateNextSteps(ideaData));
    } finally {
      setLoading(false);
    }
  };

  const refreshSteps = async () => {
    try {
      setRefreshing(true);
      const response = await api.post(`/api/ideas/${ideaId}/next-steps/refresh`);
      setSteps(response.data.steps);
      toast({
        title: 'Next steps refreshed',
        description: 'AI has generated new recommendations based on your progress.',
      });
    } catch (error) {
      toast({
        title: 'Failed to refresh',
        description: 'Could not generate new recommendations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const toggleStep = async (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    const newCompleted = !step.completed;
    
    // Optimistic update
    setSteps(steps.map(s => 
      s.id === stepId ? { ...s, completed: newCompleted } : s
    ));

    try {
      await api.patch(`/api/ideas/${ideaId}/next-steps/${stepId}`, {
        completed: newCompleted,
      });
      
      if (newCompleted) {
        toast({
          title: '✅ Step completed!',
          description: 'Great progress! Keep building momentum.',
        });
      }
    } catch (error) {
      // Revert on error
      setSteps(steps.map(s => 
        s.id === stepId ? { ...s, completed: !newCompleted } : s
      ));
      toast({
        title: 'Failed to update',
        description: 'Could not save your progress. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Client-side fallback generation
  const generateNextSteps = (idea: typeof ideaData): NextStep[] => {
    const steps: NextStep[] = [];
    const stage = idea.stage?.toLowerCase() || 'post idea';

    // Stage-specific recommendations
    if (stage.includes('post idea') || stage.includes('1')) {
      steps.push({
        id: 'validate-problem',
        title: 'Validate your problem with 5 potential users',
        description: 'Interview people who experience this problem to confirm it\'s worth solving.',
        category: 'validation',
        priority: 'high',
        completed: false,
        estimatedTime: '1-2 weeks',
      });

      if (idea.desiredTeammates) {
        steps.push({
          id: 'find-cofounder',
          title: `Find a ${idea.desiredTeammates.split(',')[0].trim()}`,
          description: 'Building alone is hard. Find someone who complements your skills.',
          category: 'team',
          priority: 'high',
          completed: false,
          estimatedTime: '2-4 weeks',
        });
      }

      steps.push({
        id: 'create-mvp-plan',
        title: 'Define your MVP scope',
        description: 'List the absolute minimum features needed to test your core hypothesis.',
        category: 'product',
        priority: 'medium',
        completed: false,
        estimatedTime: '1 week',
      });
    }

    if (stage.includes('find advisors') || stage.includes('2')) {
      steps.push({
        id: 'recruit-advisor',
        title: 'Find an advisor in your industry',
        description: 'Get guidance from someone who\'s been there before.',
        category: 'team',
        priority: 'high',
        completed: false,
        estimatedTime: '2-3 weeks',
      });

      steps.push({
        id: 'competitive-analysis',
        title: 'Research your top 3 competitors',
        description: 'Understand what exists and how you\'ll differentiate.',
        category: 'market',
        priority: 'medium',
        completed: false,
        estimatedTime: '1 week',
      });
    }

    if (stage.includes('build') || stage.includes('3')) {
      steps.push({
        id: 'build-mvp',
        title: 'Build and launch your MVP',
        description: 'Get something in users\' hands as quickly as possible.',
        category: 'product',
        priority: 'high',
        completed: false,
        estimatedTime: '4-8 weeks',
      });

      steps.push({
        id: 'get-first-users',
        title: 'Acquire your first 10 users',
        description: 'Focus on quality feedback, not quantity.',
        category: 'market',
        priority: 'high',
        completed: false,
        estimatedTime: '2-4 weeks',
      });
    }

    if (stage.includes('funding') || stage.includes('4')) {
      steps.push({
        id: 'prepare-pitch-deck',
        title: 'Create your pitch deck',
        description: 'Tell your story in a compelling, investor-ready format.',
        category: 'funding',
        priority: 'high',
        completed: false,
        estimatedTime: '1-2 weeks',
      });

      steps.push({
        id: 'identify-investors',
        title: 'Research 10 relevant investors',
        description: 'Find investors who focus on your stage, industry, and geography.',
        category: 'funding',
        priority: 'high',
        completed: false,
        estimatedTime: '1 week',
      });
    }

    // Always include market validation
    steps.push({
      id: 'market-size',
      title: 'Calculate your TAM, SAM, and SOM',
      description: 'Understand the size of your market opportunity.',
      category: 'market',
      priority: 'medium',
      completed: false,
      estimatedTime: '3-5 days',
    });

    return steps.slice(0, 5); // Return top 5 steps
  };

  const completedCount = steps.filter(s => s.completed).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-2 border-purple-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Your Next Steps</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  AI-powered recommendations to move forward
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshSteps}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-purple-600">
                {completedCount} of {steps.length} completed
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const CategoryIcon = categoryIcons[step.category];
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border-2 ${
                    step.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                  } ${priorityColors[step.priority]} hover:shadow-md transition-all cursor-pointer`}
                  onClick={() => toggleStep(step.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-semibold ${
                          step.completed ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}>
                          {step.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`${categoryColors[step.category]} flex items-center gap-1 text-xs`}
                        >
                          <CategoryIcon className="h-3 w-3" />
                          {step.category}
                        </Badge>
                      </div>
                      
                      <p className={`text-sm mt-1 ${
                        step.completed ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {step.description}
                      </p>
                      
                      {step.estimatedTime && (
                        <p className="text-xs text-muted-foreground mt-2">
                          ⏱️ Estimated time: {step.estimatedTime}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {completedCount === steps.length && steps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg text-center"
            >
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-green-900">All steps completed! 🎉</h4>
              <p className="text-sm text-green-700 mt-1">
                Click refresh to get new recommendations for your next phase.
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
