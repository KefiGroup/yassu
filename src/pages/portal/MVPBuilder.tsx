import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  Code, 
  Layout, 
  Database,
  Rocket,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft
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

const SUGGESTED_PROMPTS = [
  "What features should I prioritize for my MVP?",
  "What tech stack would you recommend?",
  "Create a detailed feature specification",
  "Generate user stories for the core features",
  "What should my database schema look like?",
  "Create a development timeline and milestones",
];

export default function MVPBuilder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ideaId = searchParams.get("ideaId");
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: idea } = useQuery<IdeaData>({
    queryKey: ["/api/ideas", ideaId],
    enabled: !!ideaId,
  });

  const { data: businessPlan } = useQuery<any>({
    queryKey: ["/api/ideas", ideaId, "workflow-sections"],
    enabled: !!ideaId,
  });

  useEffect(() => {
    if (idea && messages.length === 0) {
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `# Welcome to MVP Builder

I'm your AI product development assistant. I have access to your idea **"${idea.title}"** and your business plan details.

I can help you with:
- **Feature prioritization** - What to build first
- **Technical specifications** - Detailed specs for developers
- **Tech stack recommendations** - Best tools for your use case
- **Database design** - Schema and data models
- **User stories** - Clear requirements for development
- **Development roadmap** - Timeline and milestones

Once we create your MVP specification, you can export it to **Manus.AI** to build your actual product.

What would you like to work on first?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [idea, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

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
      const response = await fetch("/api/ai/mvp-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId,
          message: userMessage.content,
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
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessage.id 
                        ? { ...m, content: m.content + parsed.content }
                        : m
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
      handleSend();
    }
  };

  const copyToClipboard = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const exportToManus = () => {
    const allContent = messages
      .filter(m => m.role === "assistant")
      .map(m => m.content)
      .join("\n\n---\n\n");
    
    const manusUrl = `https://manus.ai?context=${encodeURIComponent(allContent.slice(0, 2000))}`;
    window.open(manusUrl, "_blank");
  };

  if (!ideaId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Rocket className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Select an Idea</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Please select an idea from your dashboard to start building your MVP specification.
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
              <Sparkles className="h-5 w-5 text-primary" />
              MVP Builder
            </h1>
            {idea && (
              <p className="text-sm text-muted-foreground">{idea.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportToManus}
            disabled={messages.length <= 1}
            data-testid="button-export-manus"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Export to Manus.AI
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex flex-col w-64 border-r p-4 gap-4">
          <div>
            <h3 className="font-semibold mb-2 text-sm">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-left h-auto py-2 px-3"
                  onClick={() => setInput(prompt)}
                  data-testid={`button-prompt-${i}`}
                >
                  <span className="text-xs">{prompt}</span>
                </Button>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-semibold mb-2 text-sm">Capabilities</h3>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Code className="h-3 w-3" />
                <span>Feature Specifications</span>
              </div>
              <div className="flex items-center gap-2">
                <Layout className="h-3 w-3" />
                <span>UI/UX Guidelines</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-3 w-3" />
                <span>Database Design</span>
              </div>
              <div className="flex items-center gap-2">
                <Rocket className="h-3 w-3" />
                <span>Launch Roadmap</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  data-testid={`message-${message.role}-${message.id}`}
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
                    {message.role === "assistant" && message.content && (
                      <div className="px-3 pb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => copyToClipboard(message.content, message.id)}
                          data-testid={`button-copy-${message.id}`}
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Copy
                        </Button>
                      </div>
                    )}
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
            <div className="max-w-3xl mx-auto flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your MVP features, tech stack, or development plan..."
                className="min-h-[44px] max-h-32 resize-none"
                disabled={isLoading}
                data-testid="input-chat"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                data-testid="button-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
