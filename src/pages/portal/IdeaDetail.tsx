import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import BusinessPlanViewer from '@/components/portal/BusinessPlanViewer';
import {
  ArrowLeft,
  Calendar,
  Users,
  MessageSquare,
  Send,
  Edit,
} from 'lucide-react';

interface Idea {
  id: string;
  title: string;
  problem: string;
  solution: string | null;
  target_user: string | null;
  why_now: string | null;
  assumptions: string | null;
  desired_teammates: string | null;
  expected_timeline: string | null;
  stage: string;
  created_at: string;
  created_by: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

interface Tag {
  tag: string;
}

export default function IdeaDetail() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchIdea() {
      if (!ideaId) return;

      const { data: ideaData } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .single();

      if (ideaData) setIdea(ideaData);

      const { data: tagsData } = await supabase
        .from('idea_tags')
        .select('tag')
        .eq('idea_id', ideaId);

      if (tagsData) setTags(tagsData);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });

      if (commentsData) {
        // Fetch profiles separately
        const userIds = commentsData.map(c => c.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        setComments(commentsData.map(c => ({
          ...c,
          profiles: profileMap.get(c.user_id) || null
        })));
      }

      setLoading(false);
    }

    fetchIdea();
  }, [ideaId]);

  const handleComment = async () => {
    if (!newComment.trim() || !user || !ideaId) return;

    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      idea_id: ideaId,
      content: newComment,
    });

    if (error) {
      toast({
        title: 'Error posting comment',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setNewComment('');
      // Refresh comments
      const { data } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });

      if (data) {
        const userIds = data.map(c => c.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        setComments(data.map(c => ({
          ...c,
          profiles: profileMap.get(c.user_id) || null
        })));
      }
    }
    setSubmitting(false);
  };

  const handleJoinRequest = async () => {
    if (!user || !ideaId) return;

    const { error } = await supabase.from('join_requests').insert({
      user_id: user.id,
      idea_id: ideaId,
      message: 'I would like to join this idea!',
    });

    if (error) {
      if (error.message.includes('duplicate')) {
        toast({
          title: 'Already requested',
          description: 'You have already requested to join this idea.',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Request sent!',
        description: 'The idea creator will review your request.',
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const stageColors: Record<string, string> = {
    concept: 'bg-blue-100 text-blue-700',
    validating: 'bg-amber-100 text-amber-700',
    building: 'bg-emerald-100 text-emerald-700',
    launched: 'bg-purple-100 text-purple-700',
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-20 bg-muted rounded" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Idea not found</p>
        <Button variant="outline" onClick={() => navigate('/portal/ideas')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>
      </div>
    );
  }

  const isOwner = user?.id === idea.created_by;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => navigate('/portal/ideas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold flex-1">{idea.title}</h1>
        <Badge className={stageColors[idea.stage] || 'bg-muted'}>{idea.stage}</Badge>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {new Date(idea.created_at).toLocaleDateString()}
              </div>
              {isOwner && (
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((t) => (
                  <Badge key={t.tag} variant="secondary">
                    {t.tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Problem */}
            <div>
              <h3 className="font-semibold text-lg mb-2">Problem</h3>
              <p className="text-muted-foreground">{idea.problem}</p>
            </div>

            {/* Solution */}
            {idea.solution && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Proposed Solution</h3>
                <p className="text-muted-foreground">{idea.solution}</p>
              </div>
            )}

            {/* Target User */}
            {idea.target_user && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Target User</h3>
                <p className="text-muted-foreground">{idea.target_user}</p>
              </div>
            )}

            {/* Why Now */}
            {idea.why_now && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Why Now?</h3>
                <p className="text-muted-foreground">{idea.why_now}</p>
              </div>
            )}

            {/* Desired Teammates */}
            {idea.desired_teammates && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Looking For</h3>
                <p className="text-muted-foreground">{idea.desired_teammates}</p>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {!isOwner && (
                <Button onClick={handleJoinRequest}>
                  <Users className="w-4 h-4 mr-2" />
                  Request to Join
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Business Plan Section */}
      <BusinessPlanViewer ideaId={ideaId!} />

      {/* Comments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Discussion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getInitials(comment.profiles?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.profiles?.full_name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No comments yet. Start the discussion!</p>
            )}

            <Separator />

            <div className="flex gap-3">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
              />
              <Button onClick={handleComment} disabled={submitting || !newComment.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
