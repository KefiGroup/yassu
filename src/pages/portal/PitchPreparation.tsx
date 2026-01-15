import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  Sparkles, 
  Mic,
  Copy,
  Check,
  ArrowLeft,
  AlertTriangle,
  MessageSquare,
  Target,
  Shield,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Zap,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Lightbulb,
  Building2,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type InvestorMode = "angel" | "vc";

interface DeliveryScript {
  slideNumber: number;
  slideTitle: string;
  whatYouSay: string;
  keyEmphasis: string;
  deliveryTip: string;
}

interface Objection {
  id: number;
  category: string;
  objection: string;
  whyThisComesUp: string;
  riskLevel: "Low" | "Medium" | "High";
  bestShortAnswer: string;
  ifTheyPushFurther: string;
  whatNotToSay: string;
  objectionType: "Clarifiable" | "Needs Proof Soon" | "Structural Risk" | "Likely Deal-Breaker";
  whatWouldReduceConcern: string;
}

interface RehearsalQuestion {
  question: string;
  idealAnswer: string;
  timeGuidance: string;
}

interface PitchPreparationData {
  deliveryScript: DeliveryScript[];
  objections: Objection[];
  rehearsalQuestions: RehearsalQuestion[];
}

type ViewState = "loading" | "ready" | "generating" | "prepared";

const OBJECTION_CATEGORIES = [
  { id: "problem", label: "Problem & Urgency", icon: AlertTriangle },
  { id: "solution", label: "Solution & Differentiation", icon: Lightbulb },
  { id: "market", label: "Market Size & Returns", icon: TrendingUp },
  { id: "traction", label: "Traction / Proof", icon: Target },
  { id: "business", label: "Business Model", icon: DollarSign },
  { id: "gtm", label: "Go-To-Market", icon: Zap },
  { id: "competition", label: "Competition", icon: Shield },
  { id: "team", label: "Team", icon: Users },
  { id: "timing", label: "Timing / Why Now", icon: Clock },
  { id: "risk", label: "Risk & Downside", icon: AlertTriangle },
];

export default function PitchPreparation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ideaId = searchParams.get("ideaId");
  const { toast } = useToast();
  
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [practiceMode, setPracticeMode] = useState(false);
  const [activeTab, setActiveTab] = useState("script");
  const [copiedAll, setCopiedAll] = useState(false);
  const [expandedObjections, setExpandedObjections] = useState<Set<number>>(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  
  const [investorMode, setInvestorMode] = useState<InvestorMode>("angel");
  const [preparationData, setPreparationData] = useState<PitchPreparationData | null>(null);
  const [ideaTitle, setIdeaTitle] = useState("");

  const { data: idea } = useQuery<any>({
    queryKey: ["/api/ideas", ideaId],
    enabled: !!ideaId,
  });

  const { data: pitchDeck, isLoading: pitchDeckLoading } = useQuery<any>({
    queryKey: ["pitch-deck", ideaId],
    queryFn: () => apiRequest(`/ideas/${ideaId}/pitch-deck`),
    enabled: !!ideaId,
  });

  const { data: workflowSections, isLoading: sectionsLoading } = useQuery<any[]>({
    queryKey: ["workflow-sections", ideaId],
    queryFn: () => apiRequest(`/ideas/${ideaId}/workflows`),
    enabled: !!ideaId,
  });

  useEffect(() => {
    if (idea) {
      setIdeaTitle(idea.title || "Your Startup");
    }
  }, [idea]);

  useEffect(() => {
    if (pitchDeckLoading || sectionsLoading) return;
    
    // API returns { deck: { slides: [...], investorMode, ... } }
    const deckData = pitchDeck?.deck;
    if (deckData && deckData.slides && deckData.slides.length > 0) {
      setInvestorMode(deckData.investorMode || "angel");
      setViewState("ready");
    } else {
      setViewState("loading");
      toast({
        title: "Pitch deck required",
        description: "Please generate your pitch deck first before preparing for investor meetings.",
        variant: "destructive",
      });
      navigate(`/portal/investor-pitch-deck?ideaId=${ideaId}`);
    }
  }, [pitchDeck, pitchDeckLoading, sectionsLoading, ideaId, navigate, toast]);

  const generatePreparation = async () => {
    const deckData = pitchDeck?.deck;
    if (!ideaId || !deckData) return;
    
    setViewState("generating");
    
    try {
      const businessPlanContent = workflowSections
        ?.filter((s: any) => s.content)
        .map((s: any) => `## ${s.sectionType}\n${s.content}`)
        .join("\n\n") || "";

      const response = await apiRequest("/ai/pitch-preparation", {
        method: "POST",
        body: JSON.stringify({
          ideaId,
          investorMode,
          pitchDeckSlides: deckData.slides,
          businessPlan: businessPlanContent,
        }),
      }) as { success: boolean; data?: PitchPreparationData; error?: string };

      if (response.success && response.data) {
        setPreparationData(response.data);
        setViewState("prepared");
        toast({
          title: "Preparation complete",
          description: "Your investor pitch preparation is ready for rehearsal.",
        });
      } else {
        throw new Error(response.error || "Failed to generate preparation");
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setViewState("ready");
    }
  };

  const toggleObjection = (id: number) => {
    const next = new Set(expandedObjections);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedObjections(next);
  };

  const toggleQuestion = (id: number) => {
    const next = new Set(expandedQuestions);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedQuestions(next);
  };

  const exportPreparation = () => {
    if (!preparationData) return;

    let output = `INVESTOR PITCH PREPARATION & OBJECTION PLAYBOOK\n`;
    output += `${"=".repeat(50)}\n\n`;
    output += `Startup: ${ideaTitle}\n`;
    output += `Investor Mode: ${investorMode === "angel" ? "Angel Investors" : "Institutional VCs"}\n\n`;

    output += `\n${"=".repeat(50)}\n`;
    output += `SECTION 1: SPOKEN PITCH SCRIPT\n`;
    output += `${"=".repeat(50)}\n\n`;

    preparationData.deliveryScript.forEach((script) => {
      output += `SLIDE ${script.slideNumber}: ${script.slideTitle}\n`;
      output += `${"-".repeat(40)}\n\n`;
      output += `What You Say (Out Loud):\n${script.whatYouSay}\n\n`;
      output += `Key Emphasis:\n${script.keyEmphasis}\n\n`;
      output += `Delivery Tip:\n${script.deliveryTip}\n\n\n`;
    });

    output += `\n${"=".repeat(50)}\n`;
    output += `SECTION 2: HIGH-RISK INVESTOR OBJECTIONS\n`;
    output += `${"=".repeat(50)}\n\n`;

    preparationData.objections
      .filter((o) => o.riskLevel === "High")
      .forEach((obj) => {
        output += `[${obj.riskLevel}] ${obj.category}\n`;
        output += `${"-".repeat(40)}\n`;
        output += `Objection: "${obj.objection}"\n`;
        output += `Why This Comes Up: ${obj.whyThisComesUp}\n\n`;
      });

    output += `\n${"=".repeat(50)}\n`;
    output += `SECTION 3: LIVE RESPONSE PLAYBOOK\n`;
    output += `${"=".repeat(50)}\n\n`;

    preparationData.objections.forEach((obj) => {
      output += `OBJECTION: "${obj.objection}"\n`;
      output += `${"-".repeat(40)}\n`;
      output += `Best Short Answer:\n${obj.bestShortAnswer}\n\n`;
      output += `If They Push Further:\n${obj.ifTheyPushFurther}\n\n`;
      output += `What NOT to Say:\n${obj.whatNotToSay}\n\n\n`;
    });

    output += `\n${"=".repeat(50)}\n`;
    output += `SECTION 4: DEAL-BREAKER AWARENESS\n`;
    output += `${"=".repeat(50)}\n\n`;

    preparationData.objections.forEach((obj) => {
      output += `Objection: "${obj.objection}"\n`;
      output += `Type: ${obj.objectionType}\n`;
      output += `What Would Reduce This Concern: ${obj.whatWouldReduceConcern}\n\n`;
    });

    output += `\n${"=".repeat(50)}\n`;
    output += `SECTION 5: RAPID-FIRE REHEARSAL QUESTIONS\n`;
    output += `${"=".repeat(50)}\n\n`;

    output += `QUESTIONS (Practice answering out loud):\n\n`;
    preparationData.rehearsalQuestions.forEach((q, i) => {
      output += `${i + 1}. ${q.question}\n`;
    });

    output += `\n\nANSWERS:\n\n`;
    preparationData.rehearsalQuestions.forEach((q, i) => {
      output += `${i + 1}. ${q.question}\n`;
      output += `   Answer: ${q.idealAnswer}\n`;
      output += `   Time: ${q.timeGuidance}\n\n`;
    });

    navigator.clipboard.writeText(output);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast({
      title: "Copied to clipboard",
      description: "Full preparation playbook copied for printing or review.",
    });
  };

  const renderLoadingView = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Loading pitch deck data...</p>
    </div>
  );

  const renderReadyView = () => (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/portal/investor-pitch-deck?ideaId=${ideaId}`)}
          data-testid="button-back-to-deck"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pitch Deck
        </Button>
      </div>
      
      <div className="text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Mic className="w-8 h-8 text-primary" />
        </div>
        
        <div>
          <h1 className="text-2xl font-semibold mb-2">Prepare for Your Pitch</h1>
          <p className="text-muted-foreground">
            Master the delivery, anticipate tough questions, and walk into investor meetings with confidence.
          </p>
        </div>

        <Card className="text-left">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Your Pitch Deck
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Investor Mode</span>
              <Badge variant="outline">
                {investorMode === "angel" ? "Angel Investors" : "Institutional VCs"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Slides</span>
              <Badge variant="outline">{pitchDeck?.deck?.slides?.length || 0} slides</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="text-left">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              What You'll Get
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Mic className="w-4 h-4 mt-0.5 text-primary" />
                <span>Spoken delivery script for each slide</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-primary" />
                <span>High-probability investor objections by category</span>
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 mt-0.5 text-primary" />
                <span>Live Q&A response playbook</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-primary" />
                <span>Deal-breaker awareness and mitigation</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 mt-0.5 text-primary" />
                <span>Rapid-fire rehearsal drill</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Button size="lg" onClick={generatePreparation} data-testid="button-generate-preparation">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Preparation
        </Button>
      </div>
    </div>
  );

  const renderGeneratingView = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Mic className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Preparing Your Pitch Rehearsal</h2>
        <p className="text-muted-foreground max-w-md">
          Analyzing your pitch deck, anticipating investor objections, and crafting your delivery script...
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>This typically takes 30-60 seconds</span>
      </div>
    </div>
  );

  const renderScriptTab = () => (
    <div className="space-y-4">
      {preparationData?.deliveryScript.map((script) => (
        <Card key={script.slideNumber}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {String(script.slideNumber).padStart(2, "0")}
              </Badge>
              <CardTitle className="text-base">{script.slideTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                What You Say (Out Loud)
              </Label>
              <p className="mt-1 text-sm leading-relaxed">{script.whatYouSay}</p>
            </div>
            
            <Separator />
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Key Emphasis
                </Label>
                <p className="mt-1 text-sm">{script.keyEmphasis}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Delivery Tip
                </Label>
                <p className="mt-1 text-sm text-primary">{script.deliveryTip}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderObjectionsTab = () => {
    const highRisk = preparationData?.objections.filter((o) => o.riskLevel === "High") || [];
    const mediumRisk = preparationData?.objections.filter((o) => o.riskLevel === "Medium") || [];
    const lowRisk = preparationData?.objections.filter((o) => o.riskLevel === "Low") || [];

    const renderObjectionCard = (obj: Objection) => (
      <Card
        key={obj.id}
        className={`${
          obj.riskLevel === "High"
            ? "border-red-500/30"
            : obj.riskLevel === "Medium"
              ? "border-yellow-500/30"
              : ""
        }`}
      >
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleObjection(obj.id)}
          data-testid={`button-toggle-objection-${obj.id}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={
                    obj.riskLevel === "High"
                      ? "border-red-500 text-red-500"
                      : obj.riskLevel === "Medium"
                        ? "border-yellow-500 text-yellow-500"
                        : "border-green-500 text-green-500"
                  }
                >
                  {obj.riskLevel}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {obj.category}
                </Badge>
              </div>
              <p className="font-medium text-sm">"{obj.objection}"</p>
            </div>
            {expandedObjections.has(obj.id) ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {expandedObjections.has(obj.id) && (
          <CardContent className="pt-0 space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Why This Comes Up
              </Label>
              <p className="mt-1 text-sm">{obj.whyThisComesUp}</p>
            </div>

            {!practiceMode && (
              <>
                <Separator />
                
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Best Short Answer (Live Pitch)
                  </Label>
                  <p className="mt-1 text-sm font-medium">{obj.bestShortAnswer}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    If They Push Further
                  </Label>
                  <p className="mt-1 text-sm">{obj.ifTheyPushFurther}</p>
                </div>

                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <Label className="text-xs text-red-500 uppercase tracking-wide">
                    What NOT to Say
                  </Label>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{obj.whatNotToSay}</p>
                </div>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Objection Type
                    </Label>
                    <Badge variant="outline" className="mt-1">
                      {obj.objectionType}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      What Would Reduce This Concern
                    </Label>
                    <p className="mt-1 text-sm">{obj.whatWouldReduceConcern}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    );

    return (
      <div className="space-y-6">
        {highRisk.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-red-500 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              High-Risk Objections ({highRisk.length})
            </h3>
            <div className="space-y-3">
              {highRisk.map(renderObjectionCard)}
            </div>
          </div>
        )}

        {mediumRisk.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-yellow-500 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Medium-Risk Objections ({mediumRisk.length})
            </h3>
            <div className="space-y-3">
              {mediumRisk.map(renderObjectionCard)}
            </div>
          </div>
        )}

        {lowRisk.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-green-500 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Low-Risk Objections ({lowRisk.length})
            </h3>
            <div className="space-y-3">
              {lowRisk.map(renderObjectionCard)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRehearsalTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Rapid-Fire Q&A Drill
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {practiceMode 
              ? "Practice mode: Answer each question out loud, then toggle off to check your answers."
              : "Practice answering these questions out loud. Click to reveal the ideal answer."
            }
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {preparationData?.rehearsalQuestions.map((q, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 hover-elevate cursor-pointer"
              onClick={() => toggleQuestion(index)}
              data-testid={`button-toggle-question-${index}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="font-mono shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </Badge>
                  <p className="font-medium text-sm">{q.question}</p>
                </div>
                {expandedQuestions.has(index) ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </div>

              {!practiceMode && expandedQuestions.has(index) && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Ideal Answer
                    </Label>
                    <p className="mt-1 text-sm">{q.idealAnswer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{q.timeGuidance}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderPreparedView = () => (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/portal/investor-pitch-deck?ideaId=${ideaId}`)}
            data-testid="button-back-to-deck"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Pitch Preparation</h1>
            <p className="text-sm text-muted-foreground">
              {ideaTitle} - {investorMode === "angel" ? "Angel" : "VC"} Mode
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="practice-mode"
              checked={practiceMode}
              onCheckedChange={setPracticeMode}
              data-testid="switch-practice-mode"
            />
            <Label htmlFor="practice-mode" className="text-sm flex items-center gap-1">
              {practiceMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              Practice Mode
            </Label>
          </div>
          
          <Button
            variant="outline"
            onClick={exportPreparation}
            data-testid="button-export-preparation"
          >
            {copiedAll ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>

      {practiceMode && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-primary/10 border border-primary/20 rounded-lg">
          <EyeOff className="w-4 h-4 text-primary" />
          <p className="text-sm">
            Practice Mode is ON - Answers are hidden. Try answering out loud before revealing.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="script" data-testid="tab-script">
            <Mic className="w-4 h-4 mr-2" />
            Delivery Script
          </TabsTrigger>
          <TabsTrigger value="objections" data-testid="tab-objections">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Objections
          </TabsTrigger>
          <TabsTrigger value="rehearsal" data-testid="tab-rehearsal">
            <Zap className="w-4 h-4 mr-2" />
            Rehearsal
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="script" className="mt-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {renderScriptTab()}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="objections" className="mt-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {renderObjectionsTab()}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="rehearsal" className="mt-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {renderRehearsalTab()}
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );

  const renderCurrentView = () => {
    switch (viewState) {
      case "loading":
        return renderLoadingView();
      case "ready":
        return renderReadyView();
      case "generating":
        return renderGeneratingView();
      case "prepared":
        return renderPreparedView();
      default:
        return renderReadyView();
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={viewState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderCurrentView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
