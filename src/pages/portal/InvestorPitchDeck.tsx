import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  Sparkles, 
  Presentation,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Zap,
  Target,
  Users,
  Building2,
  CheckCircle,
  AlertCircle,
  FileDown,
  Edit3,
  Shield,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type InvestorMode = "angel" | "vc";
type DeckType = "full" | "warm_intro";
type FundraisingStage = "pre_seed" | "seed";

interface PitchContext {
  startupName: string;
  fundraisingStage: FundraisingStage;
  targetRaise: string;
  investorMode: InvestorMode;
  deckType: DeckType;
  geography: string;
  problemStatement: string;
  solutionStatement: string;
  currentTraction: string;
  founderBackground: string;
  businessPlanNotes?: string;
}

interface SlideContent {
  slideNumber: number;
  slideTitle: string;
  investorBelief: string;
  primaryHeadline: string;
  supportingSubheadline?: string;
  keyPoints: string[];
  suggestedVisual: string;
  presenterNotes?: string;
}

interface MetricValidation {
  slideNumber: number;
  slideTitle: string;
  metricsRequired: string;
  proxyMetrics: string;
  riskLevel: "Low" | "Medium" | "High";
  sensitivityNotes: string;
}

interface VersionEntry {
  timestamp: Date;
  slides: SlideContent[];
  label: string;
}

const STEPS = [
  { id: 1, name: "Intake Form", icon: FileText },
  { id: 2, name: "Generate Deck", icon: Sparkles },
  { id: 3, name: "Refine", icon: Shield },
  { id: 4, name: "Metrics", icon: Target },
  { id: 5, name: "Export", icon: FileDown },
];

export default function InvestorPitchDeck() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ideaId = searchParams.get("ideaId");
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState<Record<number, SlideContent>>({});
  const [versionHistory, setVersionHistory] = useState<VersionEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const [pitchContext, setPitchContext] = useState<PitchContext>({
    startupName: "",
    fundraisingStage: "pre_seed",
    targetRaise: "",
    investorMode: "angel",
    deckType: "full",
    geography: "",
    problemStatement: "",
    solutionStatement: "",
    currentTraction: "",
    founderBackground: "",
    businessPlanNotes: "",
  });
  
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [metricsValidation, setMetricsValidation] = useState<MetricValidation[]>([]);
  const [manusExport, setManusExport] = useState<string>("");

  const { data: idea } = useQuery<any>({
    queryKey: ["/api/ideas", ideaId],
    enabled: !!ideaId,
  });

  const { data: businessPlan } = useQuery<any>({
    queryKey: ["workflow-sections", ideaId],
    queryFn: () => apiRequest(`/ideas/${ideaId}/workflows`),
    enabled: !!ideaId,
  });

  useEffect(() => {
    if (idea) {
      setPitchContext(prev => ({
        ...prev,
        startupName: idea.title || "",
        problemStatement: idea.problem || "",
        solutionStatement: idea.solution || "",
      }));
    }
  }, [idea]);

  useEffect(() => {
    if (businessPlan?.sections) {
      const sections = Object.values(businessPlan.sections).filter(Boolean);
      if (sections.length > 0) {
        setPitchContext(prev => ({
          ...prev,
          businessPlanNotes: sections.slice(0, 3).join("\n\n---\n\n").substring(0, 2000),
        }));
      }
    }
  }, [businessPlan]);

  const updatePitchContext = (key: keyof PitchContext, value: string) => {
    setPitchContext(prev => ({ ...prev, [key]: value }));
  };

  const isIntakeValid = () => {
    return (
      pitchContext.startupName.trim() !== "" &&
      pitchContext.targetRaise.trim() !== "" &&
      pitchContext.geography.trim() !== "" &&
      pitchContext.problemStatement.trim() !== "" &&
      pitchContext.solutionStatement.trim() !== "" &&
      pitchContext.currentTraction.trim() !== "" &&
      pitchContext.founderBackground.trim() !== ""
    );
  };

  const saveToHistory = (slideData: SlideContent[], label: string) => {
    setVersionHistory(prev => [...prev, {
      timestamp: new Date(),
      slides: JSON.parse(JSON.stringify(slideData)),
      label,
    }]);
  };

  const restoreVersion = (version: VersionEntry) => {
    setSlides(JSON.parse(JSON.stringify(version.slides)));
    setEditedContent({});
    generateManusExport(version.slides);
    setShowHistory(false);
    toast({
      title: "Version Restored",
      description: `Restored to: ${version.label}`,
    });
  };

  const generateDeck = async () => {
    if (!isIntakeValid()) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all mandatory fields before generating.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setCurrentStep(2);

    try {
      const response = await fetch("/api/ai/investor-pitch-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitchContext, ideaId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate deck");
      }

      const data = await response.json();
      setSlides(data.slides);
      setMetricsValidation(data.metricsValidation || []);
      saveToHistory(data.slides, "Initial Generation");
      generateManusExport(data.slides);
      
      toast({
        title: "Pitch Deck Generated",
        description: `Your ${pitchContext.deckType === "full" ? "full" : "warm intro"} deck is ready for review.`,
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate pitch deck. Please try again.",
        variant: "destructive",
      });
      setCurrentStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const refineDeck = async () => {
    if (slides.length === 0) return;

    const currentSlides = slides.map((s, i) => editedContent[i] || s);
    saveToHistory(currentSlides, "Before Investor-Proof Refinement");

    setIsRefining(true);

    try {
      const response = await fetch("/api/ai/investor-pitch-deck/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          pitchContext, 
          slides: currentSlides,
          ideaId 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to refine deck");
      }

      const data = await response.json();
      setSlides(data.slides);
      setEditedContent({});
      saveToHistory(data.slides, "After Investor-Proof Refinement");
      generateManusExport(data.slides);
      
      toast({
        title: "Deck Investor-Proofed",
        description: "Your deck has been refined with investor-grade language.",
      });
    } catch (error) {
      console.error("Refinement error:", error);
      toast({
        title: "Refinement Failed",
        description: "Failed to refine pitch deck. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefining(false);
    }
  };

  const generateManusExport = (slideData: SlideContent[]) => {
    const maxBullets = pitchContext.deckType === "warm_intro" ? 3 : 4;
    
    const exportText = slideData.map((slide, index) => {
      const bulletPoints = slide.keyPoints.slice(0, maxBullets);
      const bullets = bulletPoints.map(p => `• ${p}`).join("\n");
      
      let slideExport = `SLIDE ${index + 1} — ${slide.slideTitle}\n\n`;
      slideExport += `HEADLINE:\n${slide.primaryHeadline}\n\n`;
      slideExport += `SUBHEAD (if any):\n${slide.supportingSubheadline || ""}\n\n`;
      slideExport += `ON-SLIDE BULLETS:\n${bullets}\n\n`;
      slideExport += `SUGGESTED VISUAL:\n${slide.suggestedVisual}`;
      
      return slideExport;
    }).join("\n\n" + "=".repeat(50) + "\n\n");

    setManusExport(`MANUS SLIDE INPUT — DO NOT EDIT CONTENT\n\n${"=".repeat(50)}\n\n${exportText}`);
  };

  const copyManusExport = async () => {
    try {
      await navigator.clipboard.writeText(manusExport);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      toast({
        title: "Copied to Clipboard",
        description: "Manus export is ready to paste.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please manually select and copy the text.",
        variant: "destructive",
      });
    }
  };

  const saveSlideEdit = (slideIndex: number) => {
    if (editedContent[slideIndex]) {
      saveToHistory(slides.map((s, i) => editedContent[i] || s), `Manual Edit: Slide ${slideIndex + 1}`);
    }
    setEditingSlide(null);
    generateManusExport(slides.map((s, i) => editedContent[i] || s));
  };

  const canAccessStep = (stepId: number) => {
    if (stepId === 1) return true;
    if (slides.length > 0) return true;
    return false;
  };

  const renderLeftPanel = () => (
    <div className="w-64 border-r bg-muted/20 flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">Investor Deck</h1>
            <p className="text-xs text-muted-foreground">Generator</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-b space-y-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Investor Mode</Label>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={pitchContext.investorMode === "angel" ? "default" : "outline"}
              onClick={() => updatePitchContext("investorMode", "angel")}
              className="flex-1 text-xs"
              data-testid="button-investor-mode-angel"
            >
              <Users className="w-3 h-3 mr-1" />
              Angel
            </Button>
            <Button
              size="sm"
              variant={pitchContext.investorMode === "vc" ? "default" : "outline"}
              onClick={() => updatePitchContext("investorMode", "vc")}
              className="flex-1 text-xs"
              data-testid="button-investor-mode-vc"
            >
              <Building2 className="w-3 h-3 mr-1" />
              VC
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Deck Type</Label>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={pitchContext.deckType === "full" ? "default" : "outline"}
              onClick={() => updatePitchContext("deckType", "full")}
              className="flex-1 text-xs"
              data-testid="button-deck-type-full"
            >
              Full (10)
            </Button>
            <Button
              size="sm"
              variant={pitchContext.deckType === "warm_intro" ? "default" : "outline"}
              onClick={() => updatePitchContext("deckType", "warm_intro")}
              className="flex-1 text-xs"
              data-testid="button-deck-type-warm"
            >
              <Zap className="w-3 h-3 mr-1" />
              Intro (6)
            </Button>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = slides.length > 0 && step.id < currentStep;
          const isAccessible = canAccessStep(step.id);
          
          return (
            <button
              key={step.id}
              onClick={() => isAccessible && setCurrentStep(step.id)}
              disabled={!isAccessible}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all text-left ${
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : isCompleted 
                    ? "bg-primary/10 text-primary hover-elevate"
                    : isAccessible
                      ? "hover-elevate"
                      : "opacity-50 cursor-not-allowed"
              }`}
              data-testid={`button-step-${step.id}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                isActive ? "bg-primary-foreground/20" : isCompleted ? "bg-primary/20" : "bg-muted"
              }`}>
                {isCompleted ? <Check className="w-3 h-3" /> : step.id}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{step.name}</div>
              </div>
              <Icon className="w-4 h-4 opacity-60" />
            </button>
          );
        })}
      </nav>

      {versionHistory.length > 0 && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full justify-start text-xs"
            data-testid="button-toggle-history"
          >
            <History className="w-3 h-3 mr-2" />
            Version History ({versionHistory.length})
          </Button>
        </div>
      )}

      {idea && (
        <div className="p-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">Idea</p>
          <p className="text-sm font-medium truncate">{idea.title}</p>
        </div>
      )}
    </div>
  );

  const renderIntakeForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Pitch Context Intake
        </CardTitle>
        <CardDescription>
          Provide the information investors need to evaluate your startup. All fields marked with * are required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startupName">Startup Name *</Label>
            <Input
              id="startupName"
              value={pitchContext.startupName}
              onChange={(e) => updatePitchContext("startupName", e.target.value)}
              placeholder="e.g., Acme Inc."
              data-testid="input-startup-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="geography">Geography *</Label>
            <Input
              id="geography"
              value={pitchContext.geography}
              onChange={(e) => updatePitchContext("geography", e.target.value)}
              placeholder="e.g., United States, Europe"
              data-testid="input-geography"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fundraisingStage">Fundraising Stage *</Label>
            <Select
              value={pitchContext.fundraisingStage}
              onValueChange={(value) => updatePitchContext("fundraisingStage", value)}
            >
              <SelectTrigger data-testid="select-fundraising-stage">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre_seed">Pre-seed</SelectItem>
                <SelectItem value="seed">Seed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="targetRaise">Target Raise Amount *</Label>
            <Input
              id="targetRaise"
              value={pitchContext.targetRaise}
              onChange={(e) => updatePitchContext("targetRaise", e.target.value)}
              placeholder="e.g., $500K, $1.5M"
              data-testid="input-target-raise"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="problemStatement">One-Sentence Problem *</Label>
            <Textarea
              id="problemStatement"
              value={pitchContext.problemStatement}
              onChange={(e) => updatePitchContext("problemStatement", e.target.value)}
              placeholder="Describe the core problem you're solving in one clear sentence"
              rows={2}
              data-testid="textarea-problem"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="solutionStatement">One-Sentence Solution *</Label>
            <Textarea
              id="solutionStatement"
              value={pitchContext.solutionStatement}
              onChange={(e) => updatePitchContext("solutionStatement", e.target.value)}
              placeholder="Describe your solution in one clear sentence"
              rows={2}
              data-testid="textarea-solution"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currentTraction">Current Traction *</Label>
            <Textarea
              id="currentTraction"
              value={pitchContext.currentTraction}
              onChange={(e) => updatePitchContext("currentTraction", e.target.value)}
              placeholder="Users, revenue, waitlist size, partnerships, or 'pre-traction' if early"
              rows={2}
              data-testid="textarea-traction"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="founderBackground">Founder Background *</Label>
            <Textarea
              id="founderBackground"
              value={pitchContext.founderBackground}
              onChange={(e) => updatePitchContext("founderBackground", e.target.value)}
              placeholder="Brief background on founders - relevant experience, achievements"
              rows={2}
              data-testid="textarea-founder"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="businessPlanNotes">Business Plan / Notes (Optional)</Label>
          <Textarea
            id="businessPlanNotes"
            value={pitchContext.businessPlanNotes}
            onChange={(e) => updatePitchContext("businessPlanNotes", e.target.value)}
            placeholder="Paste any additional context, research, or notes..."
            rows={4}
            data-testid="textarea-notes"
          />
          {businessPlan?.sections && Object.keys(businessPlan.sections).length > 0 && (
            <p className="text-xs text-muted-foreground">
              <CheckCircle className="w-3 h-3 inline mr-1 text-green-500" />
              Business plan context auto-loaded from your idea
            </p>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={generateDeck}
            disabled={!isIntakeValid() || isGenerating}
            size="lg"
            data-testid="button-generate-deck"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Investor Deck
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSlideCard = (slide: SlideContent, index: number) => {
    const displaySlide = editedContent[index] || slide;
    const isEditing = editingSlide === index;

    return (
      <Card key={index} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">
                {String(index + 1).padStart(2, "0")}
              </Badge>
              <CardTitle className="text-lg">{displaySlide.slideTitle}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isEditing ? saveSlideEdit(index) : setEditingSlide(index)}
              data-testid={`button-edit-slide-${index}`}
            >
              {isEditing ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground italic">
            Investor must believe: {displaySlide.investorBelief}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Headline</Label>
                <Input
                  value={displaySlide.primaryHeadline}
                  onChange={(e) => setEditedContent(prev => ({
                    ...prev,
                    [index]: { ...displaySlide, primaryHeadline: e.target.value }
                  }))}
                  data-testid={`input-headline-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Supporting Subheadline</Label>
                <Input
                  value={displaySlide.supportingSubheadline || ""}
                  onChange={(e) => setEditedContent(prev => ({
                    ...prev,
                    [index]: { ...displaySlide, supportingSubheadline: e.target.value }
                  }))}
                  data-testid={`input-subheadline-${index}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Key Points (one per line)</Label>
                <Textarea
                  value={displaySlide.keyPoints.join("\n")}
                  onChange={(e) => setEditedContent(prev => ({
                    ...prev,
                    [index]: { ...displaySlide, keyPoints: e.target.value.split("\n").filter(Boolean) }
                  }))}
                  rows={4}
                  data-testid={`textarea-points-${index}`}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="bg-primary/5 p-4 rounded-lg">
                <h3 className="font-semibold text-lg">{displaySlide.primaryHeadline}</h3>
                {displaySlide.supportingSubheadline && (
                  <p className="text-muted-foreground mt-1">{displaySlide.supportingSubheadline}</p>
                )}
              </div>
              
              <ul className="space-y-2">
                {displaySlide.keyPoints.map((point, pIndex) => (
                  <li key={pIndex} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                <Presentation className="w-4 h-4" />
                <span>Suggested Visual: {displaySlide.suggestedVisual}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderDeckGeneration = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Generated Pitch Deck</h2>
          <p className="text-sm text-muted-foreground">
            {pitchContext.investorMode === "angel" ? "Angel" : "VC"} Mode • {pitchContext.deckType === "full" ? "Full Deck" : "Warm Intro"} • {slides.length} Slides
          </p>
        </div>
        <Button
          onClick={refineDeck}
          disabled={isRefining}
          data-testid="button-investor-proof"
        >
          {isRefining ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Refining...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Investor-Proof This Deck
            </>
          )}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        {slides.map((slide, index) => renderSlideCard(slide, index))}
      </ScrollArea>
    </div>
  );

  const renderMetricsValidation = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Metrics & Signal Validation</h2>
        <p className="text-sm text-muted-foreground">
          Review what metrics investors will look for in each slide
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Slide</th>
                  <th className="text-left p-3 font-medium">Metrics Required</th>
                  <th className="text-left p-3 font-medium">Proxy Metrics</th>
                  <th className="text-left p-3 font-medium">Risk</th>
                  <th className="text-left p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {metricsValidation.map((metric, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {String(metric.slideNumber).padStart(2, "0")}
                        </Badge>
                        <span className="font-medium">{metric.slideTitle}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{metric.metricsRequired}</td>
                    <td className="p-3 text-sm text-muted-foreground">{metric.proxyMetrics}</td>
                    <td className="p-3">
                      <Badge 
                        variant="outline"
                        className={
                          metric.riskLevel === "High" 
                            ? "border-red-500 text-red-500" 
                            : metric.riskLevel === "Medium"
                              ? "border-yellow-500 text-yellow-500"
                              : "border-green-500 text-green-500"
                        }
                      >
                        {metric.riskLevel}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{metric.sensitivityNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-500" />
        <p className="text-sm">
          This table is for your reference only. No invented data should appear in your actual deck.
        </p>
      </div>
    </div>
  );

  const renderManusExport = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Manus Export</h2>
          <p className="text-sm text-muted-foreground">
            Copy this text and paste directly into Manus for slide design
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={copyManusExport}
            data-testid="button-copy-manus"
          >
            {copiedAll ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy for Manus
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open("https://manus.im", "_blank")}
            data-testid="button-open-manus"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Manus
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap bg-muted/30">
              {manusExport}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <Presentation className="w-5 h-5 text-primary" />
        <p className="text-sm">
          Manus will handle all visual design. This export contains only the content structure.
        </p>
      </div>
    </div>
  );

  const renderVersionHistory = () => (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="w-4 h-4" />
          Version History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {versionHistory.slice().reverse().map((version, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded bg-muted/50 hover-elevate cursor-pointer"
              onClick={() => restoreVersion(version)}
              data-testid={`button-restore-version-${index}`}
            >
              <div>
                <p className="text-sm font-medium">{version.label}</p>
                <p className="text-xs text-muted-foreground">
                  {version.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <Button variant="ghost" size="sm">
                Restore
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderCurrentStep = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="text-lg font-medium">Generating Your Pitch Deck</h3>
            <p className="text-sm text-muted-foreground">
              AI is crafting investor-grade content for your {pitchContext.deckType === "full" ? "full" : "warm intro"} deck...
            </p>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return renderIntakeForm();
      case 2:
      case 3:
        return renderDeckGeneration();
      case 4:
        return renderMetricsValidation();
      case 5:
        return renderManusExport();
      default:
        return renderIntakeForm();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {renderLeftPanel()}
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 max-w-4xl mx-auto">
            {showHistory && versionHistory.length > 0 && renderVersionHistory()}
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderCurrentStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
