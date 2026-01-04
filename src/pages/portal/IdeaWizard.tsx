import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Loader2, Lightbulb, MessageSquare, CheckCircle2, Edit3, Mic, MicOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type WizardStage = 'input' | 'analyzing' | 'clarification' | 'refining' | 'review';

interface ClarifyingQuestion {
  id: string;
  question: string;
  type: 'single-choice' | 'multiple-choice' | 'text';
  options?: string[];
  required: boolean;
}

interface RefinedIdea {
  title: string;
  problem: string;
  solution: string;
  targetUser: string;
  whyNow: string;
  assumptions?: string;
  suggestedTags: string[];
  confidence: number;
}

export default function IdeaWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [stage, setStage] = useState<WizardStage>('input');
  const [rawIdea, setRawIdea] = useState('');
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarifications, setClarifications] = useState<Record<string, string>>({});
  const [refinedIdea, setRefinedIdea] = useState<RefinedIdea | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [listeningQuestionId, setListeningQuestionId] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!rawIdea.trim() || rawIdea.trim().length < 20) {
      toast({
        title: 'Too short',
        description: 'Please provide a more detailed description (at least 20 characters).',
        variant: 'destructive',
      });
      return;
    }

    setStage('analyzing');

    try {
      const res = await fetch('/api/ideas/ai-refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rawIdea: rawIdea.trim() }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to refine idea');
      }
      
      const response = await res.json();

      if (response.stage === 'clarification') {
        setClarifyingQuestions(response.clarifyingQuestions || []);
        setStage('clarification');
      } else if (response.stage === 'refined') {
        setRefinedIdea(response.refinedIdea);
        setStage('review');
      }
    } catch (error) {
      console.error('Error analyzing idea:', error);
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze your idea. Please try again.',
        variant: 'destructive',
      });
      setStage('input');
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setRawIdea(transcript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: 'Voice input error',
          description: 'Could not access microphone. Please check permissions.',
          variant: 'destructive',
        });
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognition) {
      toast({
        title: 'Not supported',
        description: 'Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.',
        variant: 'destructive',
      });
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      toast({
        title: '🎤 Listening...',
        description: 'Start speaking your idea naturally. Click the mic again when done.',
      });
    }
  };

  const toggleVoiceForQuestion = (questionId: string) => {
    if (!recognition) {
      toast({
        title: 'Not supported',
        description: 'Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.',
        variant: 'destructive',
      });
      return;
    }

    if (listeningQuestionId === questionId) {
      recognition.stop();
      setListeningQuestionId(null);
    } else {
      // Stop any existing recognition
      if (listeningQuestionId) {
        recognition.stop();
      }
      
      // Update recognition to append to the specific question
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        
        setClarifications(prev => ({
          ...prev,
          [questionId]: transcript,
        }));
      };

      recognition.start();
      setListeningQuestionId(questionId);
      toast({
        title: '🎤 Listening...',
        description: 'Speak your answer. Click the mic again when done.',
      });
    }
  };

  const handleClarificationSubmit = async () => {
    // Check if all required questions are answered
    const unanswered = clarifyingQuestions.filter(
      q => q.required && !clarifications[q.id]
    );

    if (unanswered.length > 0) {
      toast({
        title: 'Missing answers',
        description: 'Please answer all required questions.',
        variant: 'destructive',
      });
      return;
    }

    setStage('refining');

    try {
      const response = await api.post('/api/ideas/ai-refine', {
        rawIdea: rawIdea.trim(),
        clarifications,
      });

      if (response.stage === 'refined') {
        setRefinedIdea(response.refinedIdea);
        setStage('review');
      }
    } catch (error) {
      console.error('Error refining idea:', error);
      toast({
        title: 'Refinement failed',
        description: error instanceof Error ? error.message : 'Failed to refine your idea. Please try again.',
        variant: 'destructive',
      });
      setStage('clarification');
    }
  };

  const handleSaveIdea = async () => {
    if (!refinedIdea) return;

    setSaving(true);

    try {
      const idea = await api.ideas.create({
        title: refinedIdea.title,
        problem: refinedIdea.problem,
        solution: refinedIdea.solution,
        targetUser: refinedIdea.targetUser,
        whyNow: refinedIdea.whyNow,
        assumptions: refinedIdea.assumptions,
        stage: 'idea_posted',
        isPublic: true,
        tags: refinedIdea.suggestedTags,
      });

      toast({
        title: '✨ Idea created!',
        description: 'Your idea has been saved successfully.',
      });

      navigate(`/portal/ideas/${idea.id}`);
    } catch (error) {
      setSaving(false);
      toast({
        title: 'Error saving idea',
        description: error instanceof Error ? error.message : 'Failed to save idea',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateBusinessPlan = async () => {
    if (!refinedIdea) return;

    setSaving(true);

    try {
      // First create the idea
      const idea = await api.ideas.create({
        title: refinedIdea.title,
        problem: refinedIdea.problem,
        solution: refinedIdea.solution,
        targetUser: refinedIdea.targetUser,
        whyNow: refinedIdea.whyNow,
        assumptions: refinedIdea.assumptions,
        stage: 'idea_posted',
        isPublic: true,
        tags: refinedIdea.suggestedTags,
      });

      toast({
        title: '✨ Idea created!',
        description: 'Redirecting to generate your business plan...',
      });

      // Navigate to the idea detail page which will show the business plan generation option
      navigate(`/portal/ideas/${idea.id}`);
    } catch (error) {
      setSaving(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create idea',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/portal/ideas')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Idea Wizard</h1>
            <p className="text-muted-foreground">
              Describe your idea naturally, and AI will help refine it
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stage 1: Raw Idea Input */}
      <AnimatePresence mode="wait">
        {stage === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Tell us about your idea
                </CardTitle>
                <CardDescription>
                  Just describe your idea naturally. No need for business jargon!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rawIdea">Your Idea</Label>
                    <Button
                      type="button"
                      variant={isListening ? "default" : "outline"}
                      size="sm"
                      onClick={toggleVoiceInput}
                      className={isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : ""}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4 mr-2" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          Voice Input
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="rawIdea"
                    value={rawIdea}
                    onChange={(e) => setRawIdea(e.target.value)}
                    placeholder="Type or click 'Voice Input' to speak your idea...&#10;&#10;Examples:&#10;• I notice students waste hours finding study partners who match their learning style...&#10;• Campus food delivery is slow and expensive, and students often miss meals...&#10;• I have an idea for sustainable packaging that could reduce waste in campus cafeterias..."
                    className="min-h-[200px] resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {rawIdea.length} characters (minimum 20)
                    </p>
                    {isListening && (
                      <Badge variant="destructive" className="animate-pulse">
                        🎤 Listening...
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">💡 Tips for better results:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Describe the problem you've observed</li>
                    <li>• Mention who faces this problem</li>
                    <li>• Explain why it matters</li>
                    <li>• Don't worry about having all the answers!</li>
                  </ul>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={rawIdea.trim().length < 20}
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Let AI Refine My Idea
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stage 2: Analyzing */}
        {stage === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Analyzing your idea...</h3>
                    <p className="text-muted-foreground">
                      AI is understanding your concept and determining what clarifications might help
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stage 3: Clarifying Questions */}
        {stage === 'clarification' && (
          <motion.div
            key="clarification"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Help us understand better
                </CardTitle>
                <CardDescription>
                  Answer a few questions to refine your idea
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {clarifyingQuestions.map((question, index) => (
                  <div key={question.id} className="space-y-3">
                    <Label htmlFor={question.id} className="text-base">
                      {index + 1}. {question.question}
                      {question.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>

                    {question.type === 'text' && (
                      <div className="relative">
                        <Textarea
                          id={question.id}
                          value={clarifications[question.id] || ''}
                          onChange={(e) =>
                            setClarifications({
                              ...clarifications,
                              [question.id]: e.target.value,
                            })
                          }
                          placeholder="Type or click voice button to speak..."
                          className="min-h-[100px] pr-12"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant={listeningQuestionId === question.id ? "destructive" : "outline"}
                          className="absolute top-2 right-2"
                          onClick={() => toggleVoiceForQuestion(question.id)}
                        >
                          {listeningQuestionId === question.id ? (
                            <MicOff className="h-4 w-4" />
                          ) : (
                            <Mic className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}

                    {question.type === 'single-choice' && question.options && (
                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <label
                            key={option}
                            className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <input
                              type="radio"
                              name={question.id}
                              value={option}
                              checked={clarifications[question.id] === option}
                              onChange={(e) =>
                                setClarifications({
                                  ...clarifications,
                                  [question.id]: e.target.value,
                                })
                              }
                              className="w-4 h-4"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStage('refining');
                      setTimeout(async () => {
                        try {
                          const response = await api.post('/api/ideas/ai-refine', {
                            rawIdea: rawIdea.trim(),
                            clarifications: {},
                          });
                          if (response.stage === 'refined') {
                            setRefinedIdea(response.refinedIdea);
                            setStage('review');
                          }
                        } catch (error) {
                          setStage('clarification');
                        }
                      }, 100);
                    }}
                  >
                    Skip - Generate Now
                  </Button>
                  <Button onClick={handleClarificationSubmit} className="flex-1">
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stage 4: Refining */}
        {stage === 'refining' && (
          <motion.div
            key="refining"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Creating your refined idea...</h3>
                    <p className="text-muted-foreground">
                      AI is structuring your concept into a professional business idea
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stage 5: Review Refined Idea */}
        {stage === 'review' && refinedIdea && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Your Refined Idea
                    </CardTitle>
                    <CardDescription>
                      Review and edit before saving
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {isEditing ? 'Done Editing' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Title</Label>
                  {isEditing ? (
                    <Input
                      value={refinedIdea.title}
                      onChange={(e) =>
                        setRefinedIdea({ ...refinedIdea, title: e.target.value })
                      }
                    />
                  ) : (
                    <h2 className="text-2xl font-bold">{refinedIdea.title}</h2>
                  )}
                </div>

                {/* Problem */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Problem Statement</Label>
                  {isEditing ? (
                    <Textarea
                      value={refinedIdea.problem}
                      onChange={(e) =>
                        setRefinedIdea({ ...refinedIdea, problem: e.target.value })
                      }
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">
                      {refinedIdea.problem}
                    </p>
                  )}
                </div>

                {/* Solution */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Proposed Solution</Label>
                  {isEditing ? (
                    <Textarea
                      value={refinedIdea.solution}
                      onChange={(e) =>
                        setRefinedIdea({ ...refinedIdea, solution: e.target.value })
                      }
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">
                      {refinedIdea.solution}
                    </p>
                  )}
                </div>

                {/* Target User */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Target Users</Label>
                  {isEditing ? (
                    <Textarea
                      value={refinedIdea.targetUser}
                      onChange={(e) =>
                        setRefinedIdea({ ...refinedIdea, targetUser: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">
                      {refinedIdea.targetUser}
                    </p>
                  )}
                </div>

                {/* Why Now */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Why Now?</Label>
                  {isEditing ? (
                    <Textarea
                      value={refinedIdea.whyNow}
                      onChange={(e) =>
                        setRefinedIdea({ ...refinedIdea, whyNow: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">
                      {refinedIdea.whyNow}
                    </p>
                  )}
                </div>

                {/* Assumptions */}
                {refinedIdea.assumptions && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Key Assumptions</Label>
                    {isEditing ? (
                      <Textarea
                        value={refinedIdea.assumptions}
                        onChange={(e) =>
                          setRefinedIdea({ ...refinedIdea, assumptions: e.target.value })
                        }
                        className="min-h-[100px]"
                      />
                    ) : (
                      <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                        {refinedIdea.assumptions}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Suggested Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {refinedIdea.suggestedTags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">AI Confidence</span>
                    <span className="text-sm font-bold">{refinedIdea.confidence}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${refinedIdea.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleSaveIdea}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>Save Idea</>
                    )}
                  </Button>
                  <Button
                    onClick={handleGenerateBusinessPlan}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Business Plan
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
