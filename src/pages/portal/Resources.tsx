import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, Building, Beaker, DollarSign, Users, GraduationCap, Link } from 'lucide-react';

interface Resource {
  id: string;
  type: string;
  name: string;
  description: string | null;
  url: string | null;
  contact_email: string | null;
  universities: { name: string; short_name: string | null } | null;
}

interface University {
  id: string;
  name: string;
  short_name: string | null;
}

const resourceIcons: Record<string, typeof Building> = {
  incubator: Building,
  lab: Beaker,
  grant: DollarSign,
  alumni_program: Users,
  professor: GraduationCap,
  link: Link,
};

const resourceColors: Record<string, string> = {
  incubator: 'bg-blue-100 text-blue-700',
  lab: 'bg-purple-100 text-purple-700',
  grant: 'bg-emerald-100 text-emerald-700',
  alumni_program: 'bg-amber-100 text-amber-700',
  professor: 'bg-pink-100 text-pink-700',
  link: 'bg-gray-100 text-gray-700',
};

export default function Resources() {
  const { profile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [universityFilter, setUniversityFilter] = useState<string>(profile?.university_id || 'all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      const { data: unis } = await supabase
        .from('universities')
        .select('id, name, short_name')
        .order('name');

      if (unis) setUniversities(unis);

      await fetchResources();
    }

    fetchData();
  }, []);

  async function fetchResources() {
    setLoading(true);
    let query = supabase
      .from('university_resources')
      .select(`
        id, type, name, description, url, contact_email,
        universities:university_id (name, short_name)
      `)
      .order('name');

    if (universityFilter !== 'all') {
      query = query.eq('university_id', universityFilter);
    }

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    const { data } = await query;
    if (data) setResources(data as Resource[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchResources();
  }, [universityFilter, typeFilter]);

  // Set default to user's university if they have one
  useEffect(() => {
    if (profile?.university_id && universityFilter === 'all') {
      setUniversityFilter(profile.university_id);
    }
  }, [profile]);

  const types = [...new Set(resources.map((r) => r.type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-foreground">University Resources</h1>
        <p className="text-muted-foreground">
          Discover incubators, labs, grants, and other resources at your university
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Select value={universityFilter} onValueChange={setUniversityFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select university" />
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Resource type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="incubator">Incubators</SelectItem>
            <SelectItem value="lab">Labs</SelectItem>
            <SelectItem value="grant">Grants</SelectItem>
            <SelectItem value="alumni_program">Alumni Programs</SelectItem>
            <SelectItem value="professor">Professors</SelectItem>
            <SelectItem value="link">Links</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Resources Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource, index) => {
            const Icon = resourceIcons[resource.type] || BookOpen;
            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 * index }}
              >
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${resourceColors[resource.type] || 'bg-muted'} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-1">{resource.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {resource.type.replace('_', ' ')}
                          </Badge>
                          {resource.universities?.short_name && (
                            <Badge variant="secondary" className="text-xs">
                              {resource.universities.short_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {resource.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {resource.description}
                      </p>
                    )}
                    {resource.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(resource.url!, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Visit Website
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center py-16"
        >
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or check back later
          </p>
        </motion.div>
      )}
    </div>
  );
}
