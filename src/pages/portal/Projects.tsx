import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Lightbulb, Plus, Calendar, ArrowRight, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface Idea {
  id: string;
  title: string;
  problem: string | null;
  solution: string | null;
  stage: string | null;
  createdAt: string | null;
}

const stageLabels: Record<string, string> = {
  idea_posted: 'Post Idea',
  business_plan: 'Business Plan',
  find_advisors: 'Find Advisors',
  form_team: 'Form Team',
  build_mvp: 'Build MVP',
  yassu_foundry: 'Bruin Foundry',
  launched: 'Launched',
};

const stageColors: Record<string, string> = {
  idea_posted: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  business_plan: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  find_advisors: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  form_team: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  build_mvp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  yassu_foundry: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  launched: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

const getStageNumber = (stage: string | null | undefined): number => {
  const stages = ['idea_posted', 'business_plan', 'find_advisors', 'form_team', 'build_mvp', 'yassu_foundry', 'launched'];
  return stages.indexOf(stage || 'idea_posted') + 1;
};

export default function Projects() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/my-ideas', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setIdeas(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, idea: Idea) => {
    e.stopPropagation();
    setIdeaToDelete(idea);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ideaToDelete) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ideas/${ideaToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete idea');
      }
      
      setIdeas(ideas.filter(idea => idea.id !== ideaToDelete.id));
      toast({
        title: 'Idea Deleted',
        description: 'Your idea has been permanently deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete the idea. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setIdeaToDelete(null);
    }
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
          <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
          <p className="text-muted-foreground">
            Your startup ideas and their progress
          </p>
        </div>
        <Button onClick={() => navigate('/portal/ideas/new')} data-testid="button-new-idea">
          <Plus className="w-4 h-4 mr-2" />
          New Idea
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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
      ) : ideas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea, index) => (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
            >
              <Card
                className="h-full cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
                onClick={() => navigate(`/portal/ideas/${idea.id}`)}
                data-testid={`card-project-${idea.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {idea.title}
                    </CardTitle>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        Stage {getStageNumber(idea.stage)} of 7
                      </span>
                      <Badge className={stageColors[idea.stage || 'idea_posted'] || 'bg-muted'}>
                        {stageLabels[idea.stage || 'idea_posted'] || 'Post Idea'}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {idea.problem || 'No problem statement'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {idea.solution || 'No solution defined yet'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{idea.createdAt ? new Date(idea.createdAt).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteClick(e, idea)}
                      data-testid={`button-delete-idea-${idea.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
          <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Start your entrepreneurship journey by posting your first startup idea.
            Yassu will help you develop it into a real venture.
          </p>
          <Button onClick={() => navigate('/portal/ideas/new')} data-testid="button-create-first-idea">
            <Plus className="w-4 h-4 mr-2" />
            Post Your First Idea
          </Button>
        </motion.div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Idea Permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete <strong>"{ideaToDelete?.title}"</strong>?
              </p>
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm text-destructive">
                  <strong>Warning:</strong> This action cannot be undone. Your idea, business plan, pitch deck, and all associated data will be permanently deleted.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {isDeleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Delete Permanently</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
