import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Lightbulb, Plus, Search, Filter, User, Calendar, Building } from 'lucide-react';

interface Idea {
  id: string;
  title: string;
  problem: string;
  solution: string | null;
  stage: string;
  created_at: string;
  created_by: string;
  university_id: string | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  universities: { short_name: string | null } | null;
}

interface University {
  id: string;
  name: string;
  short_name: string | null;
}

const stageOptions = [
  { value: 'all', label: 'All Stages' },
  { value: 'concept', label: 'Concept' },
  { value: 'validating', label: 'Validating' },
  { value: 'building', label: 'Building' },
  { value: 'launched', label: 'Launched' },
];

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
      const { data: unis } = await supabase
        .from('universities')
        .select('id, name, short_name')
        .order('name');

      if (unis) setUniversities(unis);

      await fetchIdeas();
    }

    fetchData();
  }, []);

  async function fetchIdeas() {
    setLoading(true);
    let query = supabase
      .from('ideas')
      .select(`
        id, title, problem, solution, stage, created_at, created_by, university_id
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (stageFilter !== 'all') {
      query = query.eq('stage', stageFilter as 'concept' | 'validating' | 'building' | 'launched');
    }

    if (universityFilter !== 'all') {
      query = query.eq('university_id', universityFilter);
    }

    const { data } = await query;
    if (data) {
      // Map to our interface with null profiles/universities for now
      setIdeas(data.map(d => ({ ...d, profiles: null, universities: null })) as Idea[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchIdeas();
  }, [stageFilter, universityFilter]);

  const filteredIdeas = ideas.filter((idea) =>
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.problem.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stageColors: Record<string, string> = {
    concept: 'bg-blue-100 text-blue-700',
    validating: 'bg-amber-100 text-amber-700',
    building: 'bg-emerald-100 text-emerald-700',
    launched: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <Button onClick={() => navigate('/portal/ideas/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Post Idea
        </Button>
      </motion.div>

      {/* Filters */}
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
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-40">
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
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="University" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Universities</SelectItem>
            {universities.map((uni) => (
              <SelectItem key={uni.id} value={uni.id}>
                {uni.short_name || uni.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Ideas Grid */}
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
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{idea.title}</CardTitle>
                    <Badge className={stageColors[idea.stage] || 'bg-muted'}>
                      {idea.stage}
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
                      <span>{idea.profiles?.full_name || 'Anonymous'}</span>
                    </div>
                    {idea.universities?.short_name && (
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        <span>{idea.universities.short_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(idea.created_at).toLocaleDateString()}</span>
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
          <Button onClick={() => navigate('/portal/ideas/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Post an Idea
          </Button>
        </motion.div>
      )}
    </div>
  );
}
