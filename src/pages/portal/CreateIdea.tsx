import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, Sparkles, Loader2, Mic, Square } from 'lucide-react';

export default function CreateIdea() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    narration: '',
  });

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setFormData(prev => ({
            ...prev,
            narration: prev.narration + finalTranscript
          }));
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          toast({
            title: 'Microphone access denied',
            description: 'Please allow microphone access to use voice input.',
            variant: 'destructive',
          });
        }
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current?.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, toast]);

  const toggleRecording = () => {
    if (!speechSupported) {
      toast({
        title: 'Voice input not supported',
        description: 'Your browser does not support voice input. Please use Chrome or Safari.',
        variant: 'destructive',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      toast({
        title: 'Recording stopped',
        description: 'Voice input has been stopped.',
      });
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
      toast({
        title: 'Recording started',
        description: 'Start speaking to narrate your idea...',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    if (!user?.id) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to create an idea.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title.trim() || !formData.narration.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please provide a name and narrate your idea.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const idea = await api.ideas.create({
        title: formData.title,
        problem: formData.narration,
        solution: formData.narration,
        stage: 'idea_posted',
        isPublic: true,
      });

      // Auto-improve the idea to extract proper problem/solution from narration
      try {
        const improveResponse = await fetch('/api/ideas/improve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            problem: formData.narration,
            solution: formData.narration,
          })
        });
        
        if (improveResponse.ok) {
          const improved = await improveResponse.json();
          // Update the idea with improved content
          await fetch(`/api/ideas/${idea.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              problem: improved.problem || formData.narration,
              solution: improved.solution || formData.narration,
              targetUser: improved.targetUser || null,
              whyNow: improved.whyNow || null,
            })
          });
        }
      } catch (improveError) {
        console.log('Auto-improve skipped:', improveError);
      }

      trackEvent('idea_created', { idea_id: idea.id, title: formData.title });
      toast({
        title: 'Idea saved!',
        description: 'Your idea has been created and refined by AI.',
      });

      navigate(`/portal/ideas/${idea.id}`);
    } catch (error) {
      setSaving(false);
      toast({
        title: 'Error creating idea',
        description: error instanceof Error ? error.message : 'Failed to create idea',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => navigate('/portal/ideas')} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Post an Idea</h1>
            <p className="text-muted-foreground">Share your startup concept anytime, anywhere</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                New Idea
              </CardTitle>
              <CardDescription>
                Give your idea a name and tell us all about it. Use the microphone to narrate your idea with your voice!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Idea Name *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Campus Food Delivery, Student Tutoring Marketplace"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="input-idea-title"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="narration">Narrate Your Idea *</Label>
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={toggleRecording}
                    className="gap-2"
                    data-testid="button-voice-input"
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-4 h-4" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Voice Input
                      </>
                    )}
                  </Button>
                </div>
                <div className="relative">
                  <Textarea
                    id="narration"
                    placeholder="Tell us about your idea... What is it? What problem does it solve? Who is it for? What makes it unique? Share as much as you'd like - you can type or use your voice!"
                    value={formData.narration}
                    onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                    rows={12}
                    required
                    className={`resize-none text-base ${isRecording ? 'border-red-500 border-2' : ''}`}
                    data-testid="input-idea-narration"
                  />
                  {isRecording && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 text-red-500">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="text-sm font-medium">Recording...</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Share your complete idea - the problem, your solution, target audience, and what makes it special. 
                  {speechSupported && " Tap the microphone button to speak your idea!"}
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={saving} data-testid="button-submit-idea">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating & Refining with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Post Idea
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </div>
  );
}
