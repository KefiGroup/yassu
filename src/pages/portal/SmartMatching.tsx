import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Users, Linkedin, Mail, Copy, Check, ExternalLink, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';

interface YassuMatch {
  userId: number;
  name: string;
  email: string;
  university: string;
  skills: string[];
  bio: string;
  matchScore: number;
  matchReason: string;
  role: string;
}

interface LinkedInSuggestion {
  id: string;
  role: string;
  title: string;
  description: string;
  searchQuery: string;
  linkedinUrl: string;
  outreachTemplate: string;
  priority: 'high' | 'medium' | 'low';
}

interface SmartMatchingResult {
  yassuMatches: YassuMatch[];
  linkedinSuggestions: LinkedInSuggestion[];
  matchingStrategy: string;
}

export default function SmartMatching() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<SmartMatchingResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [idea, setIdea] = useState<any>(null);

  useEffect(() => {
    loadIdea();
    loadMatches();
  }, [id]);

  const loadIdea = async () => {
    try {
      const response = await fetch(`/api/ideas/${id}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setIdea(data);
      }
    } catch (error) {
      console.error('Error loading idea:', error);
    }
  };

  const loadMatches = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/ideas/${id}/smart-match`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
        toast({
          title: '✨ Matches Found!',
          description: `Found ${data.yassuMatches.length} Yassu members and ${data.linkedinSuggestions.length} LinkedIn suggestions`,
        });
      } else {
        throw new Error('Failed to load matches');
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate matches. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: 'Copied!',
        description: 'Text copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <p className="text-lg text-gray-600">Finding perfect matches...</p>
          <p className="text-sm text-gray-500">Analyzing skills, experience, and compatibility</p>
        </div>
      </div>
    );
  }

  if (!matches) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No matches found. Please try again.</p>
        <Button onClick={() => navigate(`/portal/ideas/${id}`)} className="mt-4">
          Back to Idea
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/portal/ideas/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Idea
        </Button>
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Smart Matches for "{idea?.title || 'Your Idea'}"
            </h1>
            <p className="text-gray-600">
              AI-powered recommendations to help you build the perfect team
            </p>
            {matches.matchingStrategy && (
              <p className="text-sm text-purple-600 mt-2">
                💡 Strategy: {matches.matchingStrategy}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Yassu Network Matches */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Yassu Network ({matches.yassuMatches.length})
          </h2>
        </div>

        {matches.yassuMatches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No Yassu members match yet</p>
              <p className="text-sm text-gray-500">
                As more students join, we'll find perfect teammates for you!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {matches.yassuMatches.map((match) => (
              <Card key={match.userId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{match.name}</CardTitle>
                      <CardDescription>{match.university}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {Math.round(match.matchScore * 100)}% match
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Suggested Role:</p>
                    <Badge variant="outline">{match.role}</Badge>
                  </div>

                  {match.skills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {match.skills.slice(0, 5).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {match.bio && (
                    <div>
                      <p className="text-sm text-gray-600 line-clamp-2">{match.bio}</p>
                    </div>
                  )}

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm text-purple-900">
                      <span className="font-medium">Why they match:</span> {match.matchReason}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => navigate(`/portal/profile/${match.userId}`)}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement messaging
                        toast({
                          title: 'Coming Soon',
                          description: 'Direct messaging will be available soon!',
                        });
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* LinkedIn Suggestions */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Linkedin className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            LinkedIn Suggestions ({matches.linkedinSuggestions.length})
          </h2>
        </div>

        {matches.linkedinSuggestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Linkedin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No LinkedIn suggestions generated</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.linkedinSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Linkedin className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                      </div>
                      <CardDescription>{suggestion.description}</CardDescription>
                    </div>
                    <Badge className={getPriorityColor(suggestion.priority)}>
                      {suggestion.priority} priority
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Role:</p>
                    <Badge variant="outline">{suggestion.role}</Badge>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-2">Search Query:</p>
                      <code className="text-xs text-blue-700 bg-white px-2 py-1 rounded block overflow-x-auto">
                        {suggestion.searchQuery}
                      </code>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(suggestion.linkedinUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Search on LinkedIn
                    </Button>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Outreach Template:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(suggestion.outreachTemplate, suggestion.id)}
                      >
                        {copiedId === suggestion.id ? (
                          <>
                            <Check className="h-4 w-4 mr-2 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {suggestion.outreachTemplate}
                      </pre>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded">
                    💡 <strong>Tip:</strong> Personalize this message with specific details about the person's profile before sending!
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-12 flex gap-4 justify-center">
        <Button
          variant="outline"
          onClick={loadMatches}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Refresh Matches
        </Button>
        <Button onClick={() => navigate(`/portal/ideas/${id}`)}>
          Back to Idea
        </Button>
      </div>
    </div>
  );
}
