import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
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
  CheckCircle2,
  Upload
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
  const [uploadedPlan, setUploadedPlan] = useState<string>("");
  const [planSource, setPlanSource] = useState<"system" | "upload">("system");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: idea } = useQuery<IdeaData>({
    queryKey: ["/api/ideas", ideaId],
    enabled: !!ideaId,
  });

  const { data: businessPlan } = useQuery<any>({
    queryKey: ["workflow-sections", ideaId],
    queryFn: () => apiRequest(`/ideas/${ideaId}/workflows`),
    enabled: !!ideaId,
  });

  const hasSystemPlan = businessPlan && businessPlan.length > 0;
  const hasBusinessPlan = (planSource === "system" && hasSystemPlan) || (planSource === "upload" && uploadedPlan.length > 0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdfOrDocx = file.type === "application/pdf" || 
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword";

    try {
      if (isPdfOrDocx) {
        const formData = new FormData();
        formData.append("document", file);
        
        const response = await fetch("/api/documents/parse-business-plan", {
          method: "POST",
          body: formData,
          credentials: "include"
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to parse document");
        }
        
        const data = await response.json();
        setUploadedPlan(data.content);
        toast({
          title: "Business Plan Uploaded",
          description: `Extracted ${Math.round(data.content.length / 1000)}KB of text from ${file.name}`,
        });
      } else {
        const text = await file.text();
        setUploadedPlan(text);
        toast({
          title: "Business Plan Uploaded",
          description: "Your business plan has been loaded.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Could not read the file. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  const generateMVPFromBusinessPlan = async () => {
    setIsGenerating(true);
    setStep("chat");
    
    const prompt = `I have my full business plan loaded. Please analyze it and create a lean MVP specification.

Follow your tasks:
1. Extract the single most important assumption to validate first
2. Define the narrowest possible MVP to test that assumption
3. Specify the happy-path user flow only
4. List exactly 5 must-have features max
5. Explicitly list what we are NOT building yet
6. Recommend the fastest tools (no-code / low-code / AI-assisted)
7. Define ONE success metric for the first 30 days
8. Call out any feature that should be delayed, even if it feels "important"

Be opinionated. Cut anything that's overkill for MVP.`;

    await sendMessage(prompt, true);
  };

  const generateMVPSpec = async () => {
    setIsGenerating(true);
    
    const selectedFeaturesList = selectedFeatures.map(f => `- ${f.name}: ${f.description}`).join("\n");
    const prompt = `Based on my startup idea and business plan, please create a lean MVP specification.

Selected features to include:
${selectedFeaturesList}

${customFeatures ? `Additional requirements:\n${customFeatures}` : ""}

Follow your tasks:
1. Extract the single most important assumption to validate first
2. Define the narrowest possible MVP to test that assumption  
3. Specify the happy-path user flow only
4. List exactly 5 must-have features max (from my selection above)
5. Explicitly list what we are NOT building yet
6. Recommend the fastest tools (no-code / low-code / AI-assisted)
7. Define ONE success metric for the first 30 days
8. Call out any feature that should be delayed

Be opinionated. Cut anything that's overkill for MVP.`;

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
          uploadedPlan: planSource === "upload" ? uploadedPlan : undefined,
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
    const manusUrl = `https://manus.im/invitation/XT9XTFJVZ8SASD?${new URLSearchParams(context).toString()}`;
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
                  ? "Your business plan is ready! AI will analyze it and create a lean MVP spec."
                  : "Let's define the core features for your minimum viable product."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Business Plan Source Selection */}
              <div className="mb-2">
                <p className="text-sm font-medium mb-3">Choose your business plan source:</p>
                <div className="grid grid-cols-1 gap-3">
                  {/* Option 1: Use System Business Plan */}
                  <div 
                    className={`cursor-pointer p-4 rounded-lg border transition-all ${
                      planSource === "system" 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "hover:border-muted-foreground/50"
                    } ${!hasSystemPlan ? "opacity-50" : ""}`}
                    onClick={() => hasSystemPlan && setPlanSource("system")}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        planSource === "system" ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {planSource === "system" && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Use System Business Plan
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {hasSystemPlan 
                            ? `${businessPlan.length} sections loaded`
                            : "No business plan generated yet"
                          }
                        </p>
                        {hasSystemPlan && planSource === "system" && (
                          <div className="mt-3 p-2 bg-muted rounded-md">
                            <div className="space-y-1 text-xs text-muted-foreground max-h-24 overflow-hidden">
                              {businessPlan.slice(0, 2).map((section: any, i: number) => (
                                <p key={i} className="line-clamp-1">
                                  <span className="font-medium">{section.sectionKey}:</span> {section.content?.slice(0, 80)}...
                                </p>
                              ))}
                              {businessPlan.length > 2 && (
                                <p className="text-primary">+ {businessPlan.length - 2} more sections</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Upload Your Own */}
                  <div 
                    className={`cursor-pointer p-4 rounded-lg border transition-all ${
                      planSource === "upload" 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => setPlanSource("upload")}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        planSource === "upload" ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {planSource === "upload" && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Upload Your Own
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, Word, or text file (max 10MB)
                        </p>
                        {planSource === "upload" && (
                          <div className="mt-3">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              accept=".txt,.md,.doc,.docx,.pdf"
                              className="hidden"
                            />
                            {uploadedPlan ? (
                              <div className="p-2 bg-green-500/10 rounded-md flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-xs text-green-700">
                                  Uploaded ({Math.round(uploadedPlan.length / 1000)}KB)
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto h-6 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                  }}
                                >
                                  Change
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fileInputRef.current?.click();
                                }}
                                data-testid="button-upload-business-plan"
                              >
                                <Upload className="w-3 h-3 mr-2" />
                                Choose File
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {hasBusinessPlan ? (
                <>
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm">AI will analyze your business plan and:</h3>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Extract the core assumption to validate first
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Define the narrowest MVP (build instantly with Manus AI)
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        List exactly 5 must-have features max
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        Recommend no-code/low-code tools
                      </li>
                    </ul>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={generateMVPFromBusinessPlan}
                    disabled={isGenerating}
                    data-testid="button-generate-from-plan"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating MVP Spec...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate MVP from {planSource === "system" ? "System" : "Uploaded"} Plan
                      </>
                    )}
                  </Button>
                  
                  <div className="text-center">
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep("features")}
                      className="text-muted-foreground"
                      data-testid="button-manual-features"
                    >
                      Or select features manually instead
                    </Button>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
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
                      <div className="px-3 pb-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => copyToClipboard(message.content, message.id)}
                            data-testid={`button-copy-${message.id}`}
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedId === message.id ? "Copied!" : "Copy"}
                          </Button>
                          
                          {copiedId === message.id && (
                            <span className="text-xs text-muted-foreground animate-in fade-in">
                              Now paste this into <a href="https://manus.im/invitation/XT9XTFJVZ8SASD" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">Manus.im</a> to build your MVP
                            </span>
                          )}
                        </div>
                        
                        {copiedId === message.id && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                              onClick={() => window.open('https://manus.im/invitation/XT9XTFJVZ8SASD', '_blank')}
                              data-testid="button-open-manus-inline"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Open Manus AI
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/portal/ideas/${ideaId}`)}
                              data-testid="button-done-back-to-idea"
                            >
                              <ArrowLeft className="h-3 w-3 mr-1" />
                              Done - Back to Idea
                            </Button>
                          </div>
                        )}
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
              {/* Next Steps - Prominent instructions after MVP is generated */}
              {messages.length >= 1 && (
                <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                  <p className="font-semibold flex items-center gap-2 mb-3 text-primary">
                    <Rocket className="h-5 w-5" />
                    Next Steps: Build Your MVP
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Option 1: Manus AI */}
                    <div className="p-3 bg-background rounded-lg border">
                      <p className="font-medium mb-2 text-sm">Option 1: Build instantly with AI</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground mb-3">
                        <li>Copy your MVP plan (button above)</li>
                        <li>Go to <a href="https://manus.im/invitation/XT9XTFJVZ8SASD" target="_blank" rel="noopener noreferrer" className="text-primary underline" data-testid="link-manus-mvp">manus.im</a></li>
                        <li>Paste and let AI design your app</li>
                      </ol>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                        onClick={() => window.open('https://manus.im/invitation/XT9XTFJVZ8SASD', '_blank')}
                        data-testid="button-open-manus-mvp"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open Manus AI
                      </Button>
                    </div>
                    
                    {/* Option 2: Other tools */}
                    <div className="p-3 bg-background rounded-lg border">
                      <p className="font-medium mb-2 text-sm">Option 2: Build with other tools</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Copy your MVP plan and use it with:
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="secondary" className="text-xs">Figma</Badge>
                        <Badge variant="secondary" className="text-xs">Replit</Badge>
                        <Badge variant="secondary" className="text-xs">Bubble</Badge>
                        <Badge variant="secondary" className="text-xs">Webflow</Badge>
                        <Badge variant="secondary" className="text-xs">Framer</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Or share with a developer to build from scratch.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t text-center">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/portal/ideas/${ideaId}`)}
                      data-testid="button-go-back-to-idea"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Go Back to Idea
                    </Button>
                  </div>
                </div>
              )}
              
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
