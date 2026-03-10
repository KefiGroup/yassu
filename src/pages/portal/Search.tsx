import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search as SearchIcon, Lightbulb, Users, User } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useBranding } from '@/contexts/BrandingContext';

interface IdeaResult {
  id: string;
  title: string;
  problem: string;
  stage: string;
  creatorName: string;
}

interface UserResult {
  id: number;
  fullName: string;
  avatarUrl: string | null;
  skills: string[];
  university: string | null;
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const brand = useBranding();
  const brandFilter = brand.id === 'yassu' ? '' : `&brand=${encodeURIComponent(brand.id)}`;
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [ideas, setIdeas] = useState<IdeaResult[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const [ideasData, usersData] = await Promise.all([
        apiRequest<IdeaResult[]>(`/ideas/search?q=${encodeURIComponent(q)}${brandFilter}`).catch(() => []),
        apiRequest<UserResult[]>(`/users/search?q=${encodeURIComponent(q)}`).catch(() => []),
      ]);
      setIdeas(ideasData);
      setUsers(usersData);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/portal/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const formatStage = (stage: string) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Search</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ideas, teams, people..."
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Button type="submit" data-testid="button-search">Search</Button>
        </form>
      </div>

      {query && (
        <div className="mb-4 text-muted-foreground">
          Showing results for "{query}"
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query ? (
        <Tabs defaultValue="ideas" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="ideas" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Ideas ({ideas.length})
            </TabsTrigger>
            <TabsTrigger value="people" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              People ({users.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ideas">
            {ideas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No ideas found matching "{query}"
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ideas.map((idea) => (
                  <Card
                    key={idea.id}
                    className="cursor-pointer hover-elevate transition-all"
                    onClick={() => navigate(`/portal/ideas/${idea.id}`)}
                    data-testid={`card-idea-${idea.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{idea.title}</CardTitle>
                        <Badge variant="secondary">{formatStage(idea.stage)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{idea.problem}</p>
                      <p className="text-xs text-muted-foreground mt-2">by {idea.creatorName}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="people">
            {users.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No people found matching "{query}"
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {users.map((user) => (
                  <Card
                    key={user.id}
                    className="cursor-pointer hover-elevate transition-all"
                    onClick={() => navigate(`/portal/users/${user.id}`)}
                    data-testid={`card-user-${user.id}`}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.fullName}</p>
                        {user.university && (
                          <p className="text-sm text-muted-foreground truncate">{user.university}</p>
                        )}
                        {user.skills && user.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.skills.slice(0, 3).map((skill, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Enter a search term to find ideas and people</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
