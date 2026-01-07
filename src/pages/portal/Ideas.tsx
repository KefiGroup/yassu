import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Lightbulb, Plus, Search, User, Calendar, Building } from 'lucide-react';

interface Idea {
  id: string;
  title: string;
  problem: string;
  solution: string | null;
  stage: string;
  createdAt: string;
  createdBy: number;
  universityId: string | null;
}

interface University {
  id: string;
  name: string;
  shortName: string | null;
}

const stageOptions = [
  { value: 'all', label: 'All Stages' },
  { value: 'idea_posted', label: 'Post Idea' },
  { value: 'business_plan', label: 'Business Plan' },
  { value: 'find_advisors', label: 'Find Advisors and Collaborators' },
  { value: 'form_team', label: 'Form Team' },
  { value: 'build_mvp', label: 'Build MVP' },
  { value: 'yassu_foundry', label: 'Yassu Foundry' },
  { value: 'launched', label: 'Launched' },
];

const stageLabels: Record<string, string> = {
  idea_posted: 'Post Idea',
  business_plan: 'Business Plan',
  find_advisors: 'Find Advisors and Collaborators',
  form_team: 'Form Team',
  build_mvp: 'Build MVP',
  yassu_foundry: 'Yassu Foundry',
  launched: 'Launched',
};

export default function Ideas() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const [ideasData, unisData] = await Promise.all([
          api.ideas.list(),
          api.universities.list()
        ]);
        setIdeas(ideasData);
        setUniversities(unisData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch = 
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.problem.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'all' || idea.stage === stageFilter;
    const matchesUniversity = universityFilter === 'all' || idea.universityId === universityFilter;
    return matchesSearch && matchesStage && matchesUniversity;
  });

  const stageColors: Record<string, string> = {
    idea_posted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    business_plan: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    find_advisors: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    form_team: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    build_mvp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    yassu_foundry: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
    launched: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ideas Marketplace</h1>
          <p className="text-muted-foreground">
            Discover startup ideas and find the right one to join
          </p>
        </div>
        <Button onClick={() => navigate('/portal/ideas/new')} data-testid="button-post-idea">
          <Plus className="w-4 h-4 mr-2" />
          Post Idea
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-ideas"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-stage-filter">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            {stageOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={universityFilter} onValueChange={setUniversityFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-university-filter">
            <SelectValue placeholder="University" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Universities</SelectItem>
            {universities.map((uni) => (
              <SelectItem key={uni.id} value={uni.id}>
                {uni.shortName || uni.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredIdeas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIdeas.map((idea, index) => (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
            >
              <Card
                className="h-full cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
                onClick={() => navigate(`/portal/ideas/${idea.id}`)}
                data-testid={`card-idea-${idea.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{idea.title}</CardTitle>
                    <Badge className={stageColors[idea.stage || 'idea_posted'] || 'bg-muted'}>
                      {stageLabels[idea.stage || 'idea_posted'] || 'Post Idea'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {idea.problem}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Creator</span>
                    </div>
                    {idea.universityId && (
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        <span>{universities.find(u => u.id === idea.universityId)?.shortName || 'University'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center py-16"
        >
          <Lightbulb className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No ideas found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || stageFilter !== 'all' || universityFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Be the first to post an idea!'}
          </p>
          <Button onClick={() => navigate('/portal/ideas/new')} data-testid="button-post-idea-empty">
            <Plus className="w-4 h-4 mr-2" />
            Post an Idea
          </Button>
        </motion.div>
      )}
    </div>
  );
}
