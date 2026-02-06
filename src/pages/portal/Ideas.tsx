import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { motion } from 'framer-motion';
import { Lightbulb, Plus, Search, Calendar, Building, Factory, ChevronDown, X, Check } from 'lucide-react';

interface Industry {
  id: number;
  name: string;
  slug: string;
}

interface Idea {
  id: string;
  title: string;
  problem: string;
  solution: string | null;
  stage: string;
  createdAt: string;
  createdBy: number;
  universityId: string | null;
  creatorName: string | null;
  creatorAvatarUrl: string | null;
  industries: Industry[];
}

interface University {
  id: string;
  name: string;
  shortName: string | null;
}

const stageLabels: Record<string, string> = {
  idea_posted: 'Post Idea',
  business_plan: 'Business Plan',
  find_advisors: 'Find Advisors',
  form_team: 'Form Team',
  build_mvp: 'Build MVP',
  yassu_foundry: 'Yassu Foundry',
  launched: 'Launched',
};

const stageColors: Record<string, string> = {
  idea_posted: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  business_plan: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  find_advisors: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  form_team: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  build_mvp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  yassu_foundry: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  launched: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

export default function Ideas() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [industryFilterOpen, setIndustryFilterOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ideasData, unisData, industriesData] = await Promise.all([
          api.ideas.list(),
          api.universities.list(),
          apiRequest<Industry[]>('/industries'),
        ]);
        setIdeas(ideasData);
        setUniversities(unisData);
        setIndustries(industriesData);
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
    const matchesIndustry =
      selectedIndustries.length === 0 ||
      idea.industries?.some((ind) => selectedIndustries.includes(ind.slug));
    return matchesSearch && matchesIndustry;
  });

  const groupedByIndustry = () => {
    const groups: Record<string, Idea[]> = {};

    for (const idea of filteredIdeas) {
      if (!idea.industries || idea.industries.length === 0) {
        if (!groups['Uncategorized']) groups['Uncategorized'] = [];
        groups['Uncategorized'].push(idea);
      } else {
        for (const ind of idea.industries) {
          if (!groups[ind.name]) groups[ind.name] = [];
          if (!groups[ind.name].find(i => i.id === idea.id)) {
            groups[ind.name].push(idea);
          }
        }
      }
    }

    const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    return sortedEntries;
  };

  const toggleIndustry = (slug: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug]
    );
  };

  const filterLabel =
    selectedIndustries.length === 0
      ? 'All Industries'
      : selectedIndustries.length === 1
        ? industries.find((i) => i.slug === selectedIndustries[0])?.name || 'All Industries'
        : `${selectedIndustries.length} Industries`;

  const getIndustryCount = (slug: string) => {
    if (slug === 'all') return ideas.length;
    return ideas.filter(idea => idea.industries?.some(ind => ind.slug === slug)).length;
  };

  const industriesWithIdeas = industries.filter(ind => getIndustryCount(ind.slug) > 0);

  const renderIdeaCard = (idea: Idea) => (
    <Card
      className="h-full cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
      onClick={() => navigate(`/portal/ideas/${idea.id}`)}
      data-testid={`card-idea-${idea.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{idea.title}</CardTitle>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          <Badge className={stageColors[idea.stage || 'idea_posted'] || 'bg-muted'}>
            {stageLabels[idea.stage || 'idea_posted'] || 'Post Idea'}
          </Badge>
          {idea.industries?.map((ind) => (
            <Badge key={ind.id} variant="outline" className="text-xs">
              {ind.name}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {idea.problem}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div
            className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/portal/users/${idea.createdBy}`);
            }}
            data-testid={`link-creator-${idea.id}`}
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={idea.creatorAvatarUrl || undefined} />
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                {idea.creatorName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="hover:underline">{idea.creatorName || 'Creator'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-primary" />
            Ideas Marketplace
          </h1>
          <p className="text-muted-foreground">
            Discover startup ideas and join teams building the future
          </p>
        </div>
        <Button onClick={() => navigate('/portal/ideas/new')} data-testid="button-post-idea">
          <Plus className="w-4 h-4 mr-2" />
          Post Your Idea
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, problem, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-ideas"
          />
        </div>

        <Popover open={industryFilterOpen} onOpenChange={setIndustryFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 min-w-[180px] justify-between"
              data-testid="button-industry-filter"
            >
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4" />
                <span className="truncate">{filterLabel}</span>
              </div>
              <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Filter by Industry</h4>
                {selectedIndustries.length > 0 && (
                  <button
                    onClick={() => setSelectedIndustries([])}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-clear-all-industries"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {industriesWithIdeas.map((ind) => {
                  const isSelected = selectedIndustries.includes(ind.slug);
                  return (
                    <div
                      key={ind.id}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                      onClick={() => toggleIndustry(ind.slug)}
                      data-testid={`filter-industry-${ind.slug}`}
                    >
                      <div className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className="flex-1">{ind.name}</span>
                      <Badge variant="secondary" className="text-xs">{getIndustryCount(ind.slug)}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </motion.div>

      {selectedIndustries.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIndustries.map((slug) => {
            const ind = industries.find((i) => i.slug === slug);
            return (
              <Badge key={slug} variant="default" className="gap-1 pl-2 pr-1">
                {ind?.name || slug}
                <button
                  onClick={() => toggleIndustry(slug)}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary-foreground/20"
                  data-testid={`button-remove-industry-${slug}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
          <button
            onClick={() => setSelectedIndustries([])}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-clear-industry-filter"
          >
            Clear all
          </button>
        </div>
      )}

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
        <div className="space-y-8">
          {groupedByIndustry().map(([industryName, industryIdeas]) => (
            <motion.div
              key={industryName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{industryName}</h2>
                <Badge variant="secondary" className="text-xs">{industryIdeas.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {industryIdeas.map((idea) => (
                  <motion.div
                    key={idea.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderIdeaCard(idea)}
                  </motion.div>
                ))}
              </div>
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
            {searchQuery || selectedIndustries.length > 0
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
