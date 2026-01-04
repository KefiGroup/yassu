import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, Lightbulb, CheckCircle, Clock, XCircle } from 'lucide-react';

interface PipelineStats {
  totalIdeas: number;
  activeIdeas: number;
  teamsFormed: number;
  projectsLaunched: number;
  conversionRate: number;
}

interface IdeaStage {
  id: number;
  title: string;
  creator: string;
  stage: 'submitted' | 'review' | 'active' | 'team_building' | 'launched' | 'archived';
  createdAt: string;
  teamSize: number;
}

const Pipeline = () => {
  const [stats, setStats] = useState<PipelineStats>({
    totalIdeas: 0,
    activeIdeas: 0,
    teamsFormed: 0,
    projectsLaunched: 0,
    conversionRate: 0,
  });
  const [ideas, setIdeas] = useState<IdeaStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      // Fetch pipeline statistics
      const statsRes = await fetch('/api/admin/pipeline/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch ideas with stages
      const ideasRes = await fetch('/api/admin/pipeline/ideas');
      if (ideasRes.ok) {
        const ideasData = await ideasRes.json();
        setIdeas(ideasData);
      }
    } catch (error) {
      console.error('Failed to fetch pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: IdeaStage['stage']) => {
    switch (stage) {
      case 'submitted':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'review':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'team_building':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'launched':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'archived':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStageIcon = (stage: IdeaStage['stage']) => {
    switch (stage) {
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      case 'review':
        return <Clock className="w-4 h-4" />;
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'team_building':
        return <Users className="w-4 h-4" />;
      case 'launched':
        return <TrendingUp className="w-4 h-4" />;
      case 'archived':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const filterIdeasByStage = (stage: IdeaStage['stage']) => {
    return ideas.filter(idea => idea.stage === stage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pipeline</h1>
        <p className="text-muted-foreground mt-2">
          Track ideas from submission to launch. Monitor conversion rates and team formation.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Ideas</CardDescription>
            <CardTitle className="text-3xl">{stats.totalIdeas}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="w-3 h-3" />
              All time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Ideas</CardDescription>
            <CardTitle className="text-3xl">{stats.activeIdeas}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="w-3 h-3" />
              Currently active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Teams Formed</CardDescription>
            <CardTitle className="text-3xl">{stats.teamsFormed}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              Total teams
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Projects Launched</CardDescription>
            <CardTitle className="text-3xl">{stats.projectsLaunched}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              Successfully launched
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-3xl">{stats.conversionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              Idea → Launch
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>
            View and manage ideas at each stage of the pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">All ({ideas.length})</TabsTrigger>
              <TabsTrigger value="submitted">Submitted ({filterIdeasByStage('submitted').length})</TabsTrigger>
              <TabsTrigger value="review">Review ({filterIdeasByStage('review').length})</TabsTrigger>
              <TabsTrigger value="active">Active ({filterIdeasByStage('active').length})</TabsTrigger>
              <TabsTrigger value="team_building">Team Building ({filterIdeasByStage('team_building').length})</TabsTrigger>
              <TabsTrigger value="launched">Launched ({filterIdeasByStage('launched').length})</TabsTrigger>
              <TabsTrigger value="archived">Archived ({filterIdeasByStage('archived').length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <IdeaList ideas={ideas} getStageColor={getStageColor} getStageIcon={getStageIcon} />
            </TabsContent>

            <TabsContent value="submitted" className="mt-6">
              <IdeaList ideas={filterIdeasByStage('submitted')} getStageColor={getStageColor} getStageIcon={getStageIcon} />
            </TabsContent>

            <TabsContent value="review" className="mt-6">
              <IdeaList ideas={filterIdeasByStage('review')} getStageColor={getStageColor} getStageIcon={getStageIcon} />
            </TabsContent>

            <TabsContent value="active" className="mt-6">
              <IdeaList ideas={filterIdeasByStage('active')} getStageColor={getStageColor} getStageIcon={getStageIcon} />
            </TabsContent>

            <TabsContent value="team_building" className="mt-6">
              <IdeaList ideas={filterIdeasByStage('team_building')} getStageColor={getStageColor} getStageIcon={getStageIcon} />
            </TabsContent>

            <TabsContent value="launched" className="mt-6">
              <IdeaList ideas={filterIdeasByStage('launched')} getStageColor={getStageColor} getStageIcon={getStageIcon} />
            </TabsContent>

            <TabsContent value="archived" className="mt-6">
              <IdeaList ideas={filterIdeasByStage('archived')} getStageColor={getStageColor} getStageIcon={getStageIcon} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

interface IdeaListProps {
  ideas: IdeaStage[];
  getStageColor: (stage: IdeaStage['stage']) => string;
  getStageIcon: (stage: IdeaStage['stage']) => JSX.Element;
}

const IdeaList = ({ ideas, getStageColor, getStageIcon }: IdeaListProps) => {
  if (ideas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No ideas in this stage</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ideas.map((idea) => (
        <Card key={idea.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">{idea.title}</h3>
                  <Badge variant="outline" className={getStageColor(idea.stage)}>
                    <span className="flex items-center gap-1">
                      {getStageIcon(idea.stage)}
                      {idea.stage.replace('_', ' ')}
                    </span>
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>By {idea.creator}</span>
                  <span>•</span>
                  <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {idea.teamSize} {idea.teamSize === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`/portal/ideas/${idea.id}`}>View Details</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Pipeline;
