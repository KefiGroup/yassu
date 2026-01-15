import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  Rocket,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  FileText,
  Users,
  CreditCard,
  MessageSquare,
  Bell,
  Settings,
  Shield,
  Search,
  BarChart,
  Building,
  CheckCircle2
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

interface MVPFeature {
  id: string;
  name: string;
  description: string;
  category: "core" | "user" | "business" | "engagement";
  icon: any;
  selected: boolean;
}

const DEFAULT_FEATURES: Omit<MVPFeature, "selected">[] = [
  { id: "auth", name: "User Authentication", description: "Sign up, login, and profile management", category: "core", icon: Shield },
  { id: "dashboard", name: "User Dashboard", description: "Central hub for users to see their activity", category: "core", icon: BarChart },
  { id: "profiles", name: "User Profiles", description: "Public or private user profile pages", category: "user", icon: Users },
  { id: "messaging", name: "Messaging / Chat", description: "Direct messaging between users", category: "engagement", icon: MessageSquare },
  { id: "notifications", name: "Notifications", description: "Email and in-app notifications", category: "engagement", icon: Bell },
  { id: "search", name: "Search & Discovery", description: "Find content, users, or products", category: "core", icon: Search },
  { id: "payments", name: "Payments / Billing", description: "Accept payments or subscriptions", category: "business", icon: CreditCard },
  { id: "content", name: "Content Management", description: "Create, edit, and manage content", category: "core", icon: FileText },
  { id: "admin", name: "Admin Panel", description: "Backend management for admins", category: "business", icon: Building },
  { id: "settings", name: "User Settings", description: "Preferences and account settings", category: "user", icon: Settings },
];

type Step = "welcome" | "features" | "customize" | "chat";

export default function MVPBuilder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ideaId = searchParams.get("ideaId");
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>("welcome");
  const [features, setFeatures] = useState<MVPFeature[]>(
    DEFAULT_FEATURES.map(f => ({ ...f, selected: false }))
  );
  const [customFeatures, setCustomFeatures] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: idea } = useQuery<IdeaData>({
    queryKey: ["/api/ideas", ideaId],
    enabled: !!ideaId,
  });

  const { data: businessPlan } = useQuery<any>({
    queryKey: ["/api/ideas", ideaId, "workflow-sections"],
    enabled: !!ideaId,
  });

  const hasBusinessPlan = businessPlan && businessPlan.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleFeature = (featureId: string) => {
    setFeatures(prev => 
      prev.map(f => 
        f.id === featureId ? { ...f, selected: !f.selected } : f
      )
    );
  };

  const selectedFeatures = features.filter(f => f.selected);

  const generateMVPSpec = async () => {
    setIsGenerating(true);
    
    const selectedFeaturesList = selectedFeatures.map(f => `- ${f.name}: ${f.description}`).join("\n");
    const prompt = `Based on my startup idea and business plan, please create a comprehensive MVP specification document.

Selected features to include:
${selectedFeaturesList}

${customFeatures ? `Additional requirements:\n${customFeatures}` : ""}

Please provide:
1. **Executive Summary** - Brief overview of the MVP
2. **Core Features** - Detailed breakdown of each selected feature with user stories
3. **User Flow** - How users will navigate the product
4. **Technical Requirements** - High-level tech recommendations (keep it simple)
5. **Development Phases** - Suggested order of building features
6. **Launch Checklist** - What's needed before going live

Format this as a clear, actionable document that I could share with a developer or use with an AI coding tool.`;

    await sendMessage(prompt, true);
    setStep("chat");
  };

  const sendMessage = async (messageContent: string, isSystemGenerated = false) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent.trim(),
      timestamp: new Date(),
    };

    const savedInput = messageContent.trim();
    if (!isSystemGenerated) {
      setMessages(prev => [...prev, userMessage]);
      setInput("");
    }
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/mvp-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId,
          message: messageContent,
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
      if (!isSystemGenerated) {
        setMessages(prev => prev.slice(0, -1));
        setInput(savedInput);
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleSend = () => sendMessage(input);

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
    const context = {
      source: 'yassu-mvp-builder',
      project: idea?.title || '',
      problem: idea?.problem || '',
      solution: idea?.solution || '',
    };
    const manusUrl = `https://manus.im?${new URLSearchParams(context).toString()}`;
    window.open(manusUrl, "_blank");
  };

  if (!ideaId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Rocket className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Select an Idea</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Please select an idea from your dashboard to start building your MVP.
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
        {step === "chat" && (
          <Button
            variant="outline"
            onClick={exportToManus}
            data-testid="button-export-manus"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Build with Manus.AI
          </Button>
        )}
      </div>

      {step === "welcome" && (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Let's Build Your MVP</CardTitle>
              <CardDescription className="text-base">
                {hasBusinessPlan 
                  ? "Great news! You have a business plan ready. Let's use it to define your MVP features."
                  : "Let's define the core features for your minimum viable product."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasBusinessPlan && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Business Plan Available</p>
                    <p className="text-xs text-muted-foreground">
                      Your AI-generated business plan will be used to suggest relevant features.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <h3 className="font-medium">What we'll do:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-primary">1</span>
                    </div>
                    Select standard features for your MVP
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-primary">2</span>
                    </div>
                    Add any custom requirements you have
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-primary">3</span>
                    </div>
                    Generate a complete MVP specification
                  </li>
                </ul>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setStep("features")}
                data-testid="button-start-building"
              >
                Start Building
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "features" && (
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Select Your MVP Features</h2>
              <p className="text-muted-foreground">
                Choose the features you want to include in your MVP. You can always add more later.
              </p>
            </div>

            <div className="grid gap-6">
              {["core", "user", "engagement", "business"].map(category => {
                const categoryFeatures = features.filter(f => f.category === category);
                const categoryLabels: Record<string, string> = {
                  core: "Core Features",
                  user: "User Features", 
                  engagement: "Engagement",
                  business: "Business"
                };
                
                return (
                  <div key={category}>
                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                      {categoryLabels[category]}
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {categoryFeatures.map(feature => (
                        <Card 
                          key={feature.id}
                          className={`cursor-pointer transition-all hover-elevate ${
                            feature.selected ? "border-primary bg-primary/5" : ""
                          }`}
                          onClick={() => toggleFeature(feature.id)}
                          data-testid={`feature-${feature.id}`}
                        >
                          <CardContent className="p-4 flex items-start gap-3">
                            <Checkbox 
                              checked={feature.selected}
                              className="mt-0.5"
                              data-testid={`checkbox-${feature.id}`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <feature.icon className="h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">{feature.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{feature.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep("welcome")} data-testid="button-back-step">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedFeatures.length} features selected
                </span>
                <Button 
                  onClick={() => setStep("customize")}
                  disabled={selectedFeatures.length === 0}
                  data-testid="button-next-step"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "customize" && (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle>Customize Your MVP</CardTitle>
              <CardDescription>
                Add any specific requirements or features unique to your idea.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Selected Features:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedFeatures.map(feature => (
                    <Badge key={feature.id} variant="secondary" className="py-1">
                      <feature.icon className="h-3 w-3 mr-1" />
                      {feature.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-medium mb-2 block">
                  Additional Requirements (Optional)
                </label>
                <Textarea
                  value={customFeatures}
                  onChange={(e) => setCustomFeatures(e.target.value)}
                  placeholder="Describe any unique features or specific requirements for your MVP..."
                  className="min-h-[120px]"
                  data-testid="input-custom-features"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Example: "I need a matching algorithm to connect founders" or "Must integrate with Stripe for payments"
                </p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("features")} data-testid="button-back-customize">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={generateMVPSpec}
                  disabled={isGenerating}
                  data-testid="button-generate-spec"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate MVP Spec
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "chat" && (
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
              
              {isLoading && messages.length > 0 && messages[messages.length - 1].content === "" && (
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
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2 mb-3 flex-wrap">
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover-elevate"
                  onClick={() => setInput("Make the features more detailed")}
                >
                  More detail
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover-elevate"
                  onClick={() => setInput("What should I build first?")}
                >
                  Priority order
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover-elevate"
                  onClick={() => setInput("How long will this take to build?")}
                >
                  Timeline
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover-elevate"
                  onClick={() => setInput("What tech stack should I use?")}
                >
                  Tech stack
                </Badge>
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask follow-up questions about your MVP..."
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
      )}
    </div>
  );
}
