import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lightbulb, Users2, CheckCircle, X, Clock, MessageSquare, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Idea {
  id: string;
  title: string;
  problem: string;
  stage: string;
  createdAt: string;
  tags?: string[];
}

interface Interest {
  id: string;
  idea_id: string;
  user_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  email: string;
  full_name: string;
  university?: string;
  major?: string;
  year?: string;
  bio?: string;
  skills?: string[];
  linkedin_url?: string;
  github_url?: string;
}

export default function MyIdeas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingInterest, setUpdatingInterest] = useState<string | null>(null);

  useEffect(() => {
    fetchMyIdeas();
  }, []);

  useEffect(() => {
    if (selectedIdea) {
      fetchInterests(selectedIdea);
    }
  }, [selectedIdea]);

  async function fetchMyIdeas() {
    try {
      const response = await fetch('/api/my-ideas');
      if (response.ok) {
        const data = await response.json();
        setIdeas(data);
        if (data.length > 0 && !selectedIdea) {
          setSelectedIdea(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching ideas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchInterests(ideaId: string) {
    try {
      const response = await fetch(`/api/ideas/${ideaId}/interests`);
      if (response.ok) {
        const data = await response.json();
        setInterests(data);
      }
    } catch (error) {
      console.error('Error fetching interests:', error);
    }
  }

  async function updateInterestStatus(interestId: string, status: 'accepted' | 'rejected' | 'pending') {
    if (!selectedIdea) return;
    
    setUpdatingInterest(interestId);
    try {
      const response = await fetch(`/api/ideas/${selectedIdea}/interests/${interestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `Interest ${status} successfully`
        });
        // Refresh interests
        fetchInterests(selectedIdea);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update interest',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating interest:', error);
      toast({
        title: 'Error',
        description: 'Failed to update interest',
        variant: 'destructive'
      });
    } finally {
      setUpdatingInterest(null);
    }
  }

  const pendingInterests = interests.filter(i => i.status === 'pending');
  const acceptedInterests = interests.filter(i => i.status === 'accepted');
  const rejectedInterests = interests.filter(i => i.status === 'rejected');

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No Ideas Yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first idea to start receiving interest from collaborators
            </p>
            <Button onClick={() => navigate('/portal/ideas/new')}>
              Post Your First Idea
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedIdeaData = ideas.find(i => i.id === selectedIdea);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Projects</h1>
        <p className="text-muted-foreground">
          Manage your ideas and review interest requests from potential collaborators
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ideas List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Your Ideas ({ideas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ideas.map(idea => {
                const ideaInterestCount = interests.filter(i => i.idea_id === idea.id).length;
                const isSelected = selectedIdea === idea.id;
                
                return (
                  <button
                    key={idea.id}
                    onClick={() => setSelectedIdea(idea.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className="font-semibold mb-1">{idea.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {idea.problem}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {idea.stage}
                      </Badge>
                      {ideaInterestCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Users2 className="w-3 h-3 mr-1" />
                          {ideaInterestCount}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Interest Requests */}
        <div className="lg:col-span-2">
          {selectedIdeaData && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="mb-2">{selectedIdeaData.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {interests.length} total interest{interests.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/portal/ideas/${selectedIdea}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Idea
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pending">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pending">
                      Pending ({pendingInterests.length})
                    </TabsTrigger>
                    <TabsTrigger value="accepted">
                      Accepted ({acceptedInterests.length})
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                      Rejected ({rejectedInterests.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pending" className="space-y-4 mt-4">
                    {pendingInterests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No pending interest requests</p>
                      </div>
                    ) : (
                      pendingInterests.map(interest => (
                        <InterestCard
                          key={interest.id}
                          interest={interest}
                          onAccept={() => updateInterestStatus(interest.id, 'accepted')}
                          onReject={() => updateInterestStatus(interest.id, 'rejected')}
                          updating={updatingInterest === interest.id}
                        />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="accepted" className="space-y-4 mt-4">
                    {acceptedInterests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No accepted collaborators yet</p>
                      </div>
                    ) : (
                      acceptedInterests.map(interest => (
                        <InterestCard
                          key={interest.id}
                          interest={interest}
                          onReject={() => updateInterestStatus(interest.id, 'rejected')}
                          updating={updatingInterest === interest.id}
                          showMessageButton
                        />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="rejected" className="space-y-4 mt-4">
                    {rejectedInterests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <X className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No rejected requests</p>
                      </div>
                    ) : (
                      rejectedInterests.map(interest => (
                        <InterestCard
                          key={interest.id}
                          interest={interest}
                          onAccept={() => updateInterestStatus(interest.id, 'accepted')}
                          updating={updatingInterest === interest.id}
                        />
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InterestCard({
  interest,
  onAccept,
  onReject,
  updating,
  showMessageButton = false
}: {
  interest: Interest;
  onAccept?: () => void;
  onReject?: () => void;
  updating: boolean;
  showMessageButton?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarFallback>
              {interest.full_name?.charAt(0) || interest.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h4 className="font-semibold">{interest.full_name || interest.email}</h4>
                <p className="text-sm text-muted-foreground">
                  {interest.university && `${interest.university} • `}
                  {interest.major && `${interest.major} • `}
                  {interest.year && `Year ${interest.year}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(interest.created_at).toLocaleDateString()}
              </span>
            </div>

            {interest.bio && (
              <p className="text-sm text-muted-foreground mb-3">{interest.bio}</p>
            )}

            {interest.skills && interest.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {interest.skills.map(skill => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}

            {interest.message && (
              <div className="bg-muted p-3 rounded-lg mb-3">
                <p className="text-sm">{interest.message}</p>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {onAccept && (
                <Button
                  size="sm"
                  onClick={onAccept}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Accept
                </Button>
              )}
              {onReject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReject}
                  disabled={updating}
                >
                  <X className="w-4 h-4 mr-1" />
                  {onAccept ? 'Reject' : 'Remove'}
                </Button>
              )}
              {showMessageButton && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/portal/messages')}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Message
                </Button>
              )}
              {interest.linkedin_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(interest.linkedin_url, '_blank')}
                >
                  LinkedIn
                </Button>
              )}
              {interest.github_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(interest.github_url, '_blank')}
                >
                  GitHub
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
