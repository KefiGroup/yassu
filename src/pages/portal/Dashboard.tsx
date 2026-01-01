import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  Users,
  Workflow,
  Rocket,
  Search,
  Target,
  FileText,
  ArrowRight,
  Plus,
  Sparkles,
} from 'lucide-react';

interface Idea {
  id: string;
  title: string;
  problem: string;
  stage: string;
  created_at: string;
}

interface WorkflowRun {
  id: string;
  workflow_type: string;
  status: string;
  created_at: string;
}

const quickActions = [
  {
    title: 'Post an Idea',
    description: 'Share your startup concept',
    icon: Lightbulb,
    href: '/portal/ideas/new',
    color: 'text-amber-500',
  },
  {
    title: 'Find Teammates',
    description: 'Discover talent to join your team',
    icon: Users,
    href: '/portal/teams',
    color: 'text-blue-500',
  },
  {
    title: 'Run Competitive Scan',
    description: 'Analyze your market landscape',
    icon: Search,
    href: '/portal/workflows?type=competitive_landscape',
    color: 'text-emerald-500',
  },
  {
    title: 'Build MVP Plan',
    description: 'Design your product roadmap',
    icon: Target,
    href: '/portal/workflows?type=product_mvp_design',
    color: 'text-purple-500',
  },
];

const workflowTypes: Record<string, { label: string; icon: typeof Workflow }> = {
  idea_founder_fit: { label: 'Founder Fit', icon: Sparkles },
  competitive_landscape: { label: 'Competitive Scan', icon: Search },
  risk_moat_builder: { label: 'Risk & Moat', icon: Target },
  product_mvp_design: { label: 'MVP Design', icon: FileText },
  team_talent: { label: 'Team Talent', icon: Users },
  launch_plan: { label: 'Launch Plan', icon: Rocket },
  school_advantage: { label: 'School Advantage', icon: Lightbulb },
  funding_pitch: { label: 'Funding Pitch', icon: FileText },
};

export default function Dashboard() {
  const { profile, isVerified } = useAuth();
  const navigate = useNavigate();
  const [recentIdeas, setRecentIdeas] = useState<Idea[]>([]);
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch recent ideas
      const { data: ideas } = await supabase
        .from('ideas')
        .select('id, title, problem, stage, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (ideas) setRecentIdeas(ideas);

      // Fetch user's recent workflow runs
      const { data: workflows } = await supabase
        .from('workflow_runs')
        .select('id, workflow_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (workflows) setRecentWorkflows(workflows);
      setLoading(false);
    }

    fetchData();
  }, []);

  const stageColors: Record<string, string> = {
    concept: 'bg-blue-100 text-blue-700',
    validating: 'bg-amber-100 text-amber-700',
    building: 'bg-emerald-100 text-emerald-700',
    launched: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Founder'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {isVerified
            ? 'Your portal to building and launching your startup.'
            : 'Complete your profile to unlock all features.'}
        </p>
      </motion.div>

      {/* Verification Banner */}
      {!isVerified && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Complete your profile</p>
                  <p className="text-sm text-muted-foreground">
                    Add your university and skills to get verified
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate('/portal/profile')}>
                Complete Profile
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * (index + 1) }}
            >
              <Card
                className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
                onClick={() => navigate(action.href)}
              >
                <CardContent className="p-4">
                  <action.icon className={`w-8 h-8 ${action.color} mb-3`} />
                  <h3 className="font-medium group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Ideas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Recommended Ideas</CardTitle>
                <CardDescription>Ideas looking for teammates</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/portal/ideas')}>
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : recentIdeas.length > 0 ? (
                <div className="space-y-3">
                  {recentIdeas.map((idea) => (
                    <div
                      key={idea.id}
                      className="p-3 rounded-lg border border-border hover:border-primary/20 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/portal/ideas/${idea.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{idea.title}</h4>
                        <Badge className={stageColors[idea.stage] || 'bg-muted'}>
                          {idea.stage}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {idea.problem}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No ideas yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/portal/ideas/new')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Post the first idea
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Continue Workflows */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Continue Workflows</CardTitle>
                <CardDescription>Pick up where you left off</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/portal/workflows')}>
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : recentWorkflows.length > 0 ? (
                <div className="space-y-3">
                  {recentWorkflows.map((run) => {
                    const workflow = workflowTypes[run.workflow_type];
                    const Icon = workflow?.icon || Workflow;
                    return (
                      <div
                        key={run.id}
                        className="p-3 rounded-lg border border-border hover:border-primary/20 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/portal/workflows/${run.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {workflow?.label || run.workflow_type}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {new Date(run.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            variant={
                              run.status === 'completed'
                                ? 'default'
                                : run.status === 'running'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {run.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Workflow className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No workflows started</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/portal/workflows')}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start a workflow
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
