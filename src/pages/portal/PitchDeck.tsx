import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  Presentation,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Download,
  RefreshCw
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface IdeaData {
  id: string;
  title: string;
  problem: string;
  solution?: string;
  targetUser?: string;
  whyNow?: string;
}

interface SlideContent {
  title: string;
  content: string;
  speakerNotes?: string;
}

const SLIDE_TYPES = [
  { id: "title", name: "Title Slide", icon: "01" },
  { id: "problem", name: "The Problem", icon: "02" },
  { id: "solution", name: "The Solution", icon: "03" },
  { id: "market", name: "Market Opportunity", icon: "04" },
  { id: "product", name: "Product Demo", icon: "05" },
  { id: "business", name: "Business Model", icon: "06" },
  { id: "traction", name: "Traction", icon: "07" },
  { id: "competition", name: "Competition", icon: "08" },
  { id: "team", name: "The Team", icon: "09" },
  { id: "ask", name: "The Ask", icon: "10" },
];

const CHAT_PROMPTS = [
  "Refine the problem slide to be more impactful",
  "Make the solution slide clearer",
  "Add more compelling market data",
  "Strengthen the competitive positioning",
  "Improve the call-to-action on the ask slide",
];

export default function PitchDeck() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ideaId = searchParams.get("ideaId");
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSlide, setCopiedSlide] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: idea } = useQuery<IdeaData>({
    queryKey: ["/api/ideas", ideaId],
    enabled: !!ideaId,
  });

  const { data: businessPlan } = useQuery<any>({
    queryKey: ["workflow-sections", ideaId],
    queryFn: () => apiRequest(`/ideas/${ideaId}/workflow-sections`),
    enabled: !!ideaId,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateDeck = async () => {
    if (!ideaId) return;
    
    setIsGenerating(true);
    
    try {
      const response = await fetch("/api/ai/pitch-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate deck");
      }

      const data = await response.json();
      setSlides(data.slides);
      
      toast({
        title: "Pitch Deck Generated",
        description: "Your pitch deck is ready. You can now refine each slide.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate pitch deck. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChatSend = async () => {
    if (!input.trim() || isLoading) return;
    
    if (slides.length === 0) {
      toast({
        title: "Generate Deck First",
        description: "Please generate your pitch deck before using the refinement chat.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const savedInput = input.trim();
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/pitch-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId,
          message: userMessage.content,
          currentSlide: slides[activeSlide],
          slideIndex: activeSlide,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        let fullContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessage.id 
                        ? { ...m, content: fullContent }
                        : m
                    )
                  );
                }
                if (parsed.updatedSlide) {
                  setSlides(prev => 
                    prev.map((s, i) => 
                      i === activeSlide ? parsed.updatedSlide : s
                    )
                  );
                }
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
      setInput(savedInput);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  const copySlide = async (index: number) => {
    const slide = slides[index];
    const content = `# ${slide.title}\n\n${slide.content}${slide.speakerNotes ? `\n\n---\nSpeaker Notes:\n${slide.speakerNotes}` : ""}`;
    await navigator.clipboard.writeText(content);
    setCopiedSlide(index);
    setTimeout(() => setCopiedSlide(null), 2000);
    toast({
      title: "Copied",
      description: "Slide content copied to clipboard",
    });
  };

  const exportAllSlides = async () => {
    const content = slides.map((slide, i) => 
      `## Slide ${i + 1}: ${slide.title}\n\n${slide.content}${slide.speakerNotes ? `\n\n**Speaker Notes:**\n${slide.speakerNotes}` : ""}`
    ).join("\n\n---\n\n");
    
    await navigator.clipboard.writeText(content);
    toast({
      title: "Exported",
      description: "All slides copied to clipboard. Paste into Manus.AI to create your deck.",
    });
  };

  if (!ideaId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Presentation className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Select an Idea</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Please select an idea from your dashboard to generate your pitch deck.
        </p>
        <Button onClick={() => navigate("/portal/my-ideas")} data-testid="button-go-to-ideas">
          Go to My Ideas
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/portal/ideas/${ideaId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Presentation className="h-5 w-5 text-primary" />
              Pitch Deck Generator
            </h1>
            {idea && (
              <p className="text-sm text-muted-foreground">{idea.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {slides.length > 0 && (
            <Button
              variant="outline"
              onClick={exportAllSlides}
              data-testid="button-export-all"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to Manus.AI
            </Button>
          )}
          <Button
            onClick={generateDeck}
            disabled={isGenerating}
            data-testid="button-generate-deck"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : slides.length > 0 ? (
              <RefreshCw className="h-4 w-4 mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {slides.length > 0 ? "Regenerate" : "Generate Deck"}
          </Button>
        </div>
      </div>

      {slides.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="text-center max-w-lg">
            <Presentation className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Create Your Pitch Deck</h2>
            <p className="text-muted-foreground mb-6">
              Generate a professional 10-slide pitch deck based on your idea and business plan. 
              The AI will analyze your idea and create compelling content for each slide.
            </p>
            <Button
              size="lg"
              onClick={generateDeck}
              disabled={isGenerating}
              data-testid="button-generate-deck-main"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating Your Deck...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Pitch Deck
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-3xl">
            {SLIDE_TYPES.map((slide) => (
              <div
                key={slide.id}
                className="flex flex-col items-center p-3 rounded-lg border bg-card text-card-foreground"
              >
                <Badge variant="outline" className="mb-2">{slide.icon}</Badge>
                <span className="text-xs text-center">{slide.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r flex flex-col">
            <div className="p-3 border-b">
              <h3 className="font-semibold text-sm">Slides</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {slides.map((slide, index) => (
                  <Button
                    key={index}
                    variant={activeSlide === index ? "secondary" : "ghost"}
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => setActiveSlide(index)}
                    data-testid={`button-slide-${index}`}
                  >
                    <Badge variant="outline" className="mr-2 text-xs">
                      {String(index + 1).padStart(2, "0")}
                    </Badge>
                    <span className="text-sm truncate">{slide.title}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col">
            <Tabs defaultValue="content" className="flex-1 flex flex-col">
              <div className="border-b px-4">
                <TabsList className="h-12">
                  <TabsTrigger value="content" data-testid="tab-content">
                    <FileText className="h-4 w-4 mr-2" />
                    Slide Content
                  </TabsTrigger>
                  <TabsTrigger value="refine" data-testid="tab-refine">
                    <Bot className="h-4 w-4 mr-2" />
                    Refine with AI
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="content" className="flex-1 p-0 m-0">
                <ScrollArea className="h-full">
                  <div className="p-6 max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Badge className="mb-2">Slide {activeSlide + 1} of {slides.length}</Badge>
                        <h2 className="text-2xl font-bold">{slides[activeSlide]?.title}</h2>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copySlide(activeSlide)}
                        data-testid="button-copy-slide"
                      >
                        {copiedSlide === activeSlide ? (
                          <Check className="h-4 w-4 mr-1" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        Copy
                      </Button>
                    </div>
                    
                    <Card className="mb-6">
                      <CardContent className="p-6">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {slides[activeSlide]?.content || ""}
                          </ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>

                    {slides[activeSlide]?.speakerNotes && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Speaker Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {slides[activeSlide]?.speakerNotes}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="refine" className="flex-1 flex flex-col p-0 m-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="max-w-2xl mx-auto space-y-4">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">
                          Chat with AI to refine "{slides[activeSlide]?.title}". 
                          The AI will help you improve the content and update the slide automatically.
                        </p>
                      </CardContent>
                    </Card>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {CHAT_PROMPTS.map((prompt, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="cursor-pointer hover-elevate"
                          onClick={() => setInput(prompt)}
                          data-testid={`badge-prompt-${i}`}
                        >
                          {prompt}
                        </Badge>
                      ))}
                    </div>

                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        
                        <Card className={`max-w-[80%] ${
                          message.role === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : ""
                        }`}>
                          <CardContent className="p-3">
                            {message.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            )}
                          </CardContent>
                        </Card>
                        
                        {message.role === "user" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <Card>
                          <CardContent className="p-3">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t bg-background">
                  <div className="max-w-2xl mx-auto flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask the AI to refine this slide..."
                      className="min-h-[44px] max-h-32 resize-none"
                      disabled={isLoading}
                      data-testid="input-refine-chat"
                    />
                    <Button
                      onClick={handleChatSend}
                      disabled={!input.trim() || isLoading}
                      size="icon"
                      data-testid="button-send-refine"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
