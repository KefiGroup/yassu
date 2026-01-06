import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Rocket, Users, Calendar, Briefcase, Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface Idea {
  id: string;
  title: string;
  stage: string;
  category: string | null;
  createdAt: string;
  teamSize: number;
  role?: string | null;
  joinedAt?: string | null;
}

interface Portfolio {
  createdIdeas: Idea[];
  collaboratingIdeas: Idea[];
}

interface PortfolioSectionProps {
  userId: number;
}

const STAGE_LABELS: Record<string, string> = {
  'stage1': 'Stage 1: Refine Idea',
  'stage2': 'Stage 2: Build Team',
  'stage3': 'Stage 3: Find Advisors',
  'stage4': 'Stage 4: Build MVP',
  'stage5': 'Stage 5: Get Feedback',
  'stage6': 'Stage 6: Iterate',
  'stage7': 'Stage 7: Launch',
};

const STAGE_COLORS: Record<string, string> = {
  'stage1': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  'stage2': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'stage3': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'stage4': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'stage5': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'stage6': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'stage7': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function PortfolioSection({ userId }: PortfolioSectionProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'created' | 'collaborating'>('created');

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const data = await apiRequest<Portfolio>(`/profile/${userId}/portfolio`);
        setPortfolio(data);
      } catch (error) {
        console.error('Failed to fetch portfolio:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPortfolio();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Portfolio
          </CardTitle>
          <CardDescription>Loading projects...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!portfolio) {
    return null;
  }

  const totalProjects = portfolio.createdIdeas.length + portfolio.collaboratingIdeas.length;
  const displayIdeas = activeTab === 'created' ? portfolio.createdIdeas : portfolio.collaboratingIdeas;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Portfolio
        </CardTitle>
        <CardDescription>
          {totalProjects === 0 
            ? 'No projects yet' 
            : `${totalProjects} project${totalProjects === 1 ? '' : 's'}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalProjects === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Rocket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Start building your portfolio by creating an idea or joining a team
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link to="/portal/ideas/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Idea
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/portal/ideas">
                  <Search className="w-4 h-4 mr-2" />
                  Browse Ideas
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setActiveTab('created')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'created'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Created ({portfolio.createdIdeas.length})
              </button>
              <button
                onClick={() => setActiveTab('collaborating')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'collaborating'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Collaborating ({portfolio.collaboratingIdeas.length})
              </button>
            </div>

            {/* Project Grid */}
            {displayIdeas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {activeTab === 'created' ? 'created' : 'collaborating'} projects yet
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayIdeas.map((idea, index) => (
                  <motion.div
                    key={idea.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={`/portal/ideas/${idea.id}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <CardTitle className="text-base line-clamp-2">
                              {idea.title}
                            </CardTitle>
                            <Rocket className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`${STAGE_COLORS[idea.stage] || 'bg-gray-100 text-gray-800'} w-fit`}
                          >
                            {STAGE_LABELS[idea.stage] || idea.stage}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {idea.category && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span className="font-medium">{idea.category}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{idea.teamSize} team member{idea.teamSize === 1 ? '' : 's'}</span>
                          </div>
                          {activeTab === 'created' ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Created {new Date(idea.createdAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </span>
                            </div>
                          ) : (
                            <>
                              {idea.role && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {idea.role}
                                  </Badge>
                                </div>
                              )}
                              {idea.joinedAt && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    Joined {new Date(idea.joinedAt).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      year: 'numeric' 
                                    })}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
