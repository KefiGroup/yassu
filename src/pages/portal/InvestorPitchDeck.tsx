import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  Sparkles, 
  Presentation,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Target,
  CheckCircle,
  AlertCircle,
  FileDown,
  Edit3,
  Shield,
  History,
  FileText,
  Upload,
  ChevronDown,
  ChevronUp,
  Users,
  Building2,
  DollarSign,
  Lightbulb,
  Mic,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type InvestorMode = "angel" | "vc";
type DeckType = "full";
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

interface AIAnalysis {
  investorMode: InvestorMode;
  investorModeReason: string;
  deckType: DeckType;
  deckTypeReason: string;
  fundraisingStage: FundraisingStage;
  targetRaise: string;
  raiseReason: string;
}

interface ExtractedContext {
  startupName: string;
  problemStatement: string;
  solutionStatement: string;
  currentTraction: string;
  founderBackground: string;
  geography: string;
  keyInsights: string[];
  warnings: string[];
}

interface NextSteps {
  instruction: string;
  tips: string[];
}

interface AnalysisResponse {
  success: boolean;
  ideaTitle: string;
  analysis: AIAnalysis;
  extractedContext: ExtractedContext;
  nextSteps: NextSteps;
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

type ViewState = "loading" | "ready" | "generating" | "slides" | "metrics" | "export";

export default function InvestorPitchDeck() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ideaId = searchParams.get("ideaId");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [isRefining, setIsRefining] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState<Record<number, SlideContent>>({});
  const [versionHistory, setVersionHistory] = useState<VersionEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMoreSections, setShowMoreSections] = useState(false);
  const [uploadedPlan, setUploadedPlan] = useState<string>("");
  
  const [businessPlanPreview, setBusinessPlanPreview] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
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

  const { data: workflowSections, isLoading: sectionsLoading } = useQuery<any[]>({
    queryKey: ["workflow-sections", ideaId],
    queryFn: () => apiRequest(`/ideas/${ideaId}/workflows`),
    enabled: !!ideaId,
  });

  useEffect(() => {
    if (sectionsLoading) return;
    
    if (workflowSections && Array.isArray(workflowSections) && workflowSections.length > 0) {
      const sections = workflowSections
        .filter((section: any) => section.content)
        .map((section: any) => `## ${section.sectionType}\n${String(section.content).substring(0, 200)}...`);
      setBusinessPlanPreview(sections);
    }
    setViewState("ready");
  }, [workflowSections, sectionsLoading]);

  useEffect(() => {
    if (idea) {
      setPitchContext(prev => ({
        ...prev,
        startupName: idea.title || "",
      }));
    }
  }, [idea]);

  // Load existing pitch deck from database
  useEffect(() => {
    if (!ideaId) return;
    
    const loadExistingDeck = async () => {
      try {
        const response = await fetch(`/api/ideas/${ideaId}/pitch-deck`, {
          credentials: "include",
        });
        if (response.ok) {
          const { deck } = await response.json();
          if (deck && deck.slides && deck.slides.length > 0) {
            setSlides(deck.slides);
            setMetricsValidation(deck.metricsValidation || []);
            
            const loadedContext = {
              ...pitchContext,
              startupName: idea?.title || pitchContext.startupName,
              investorMode: deck.investorMode || pitchContext.investorMode,
              deckType: deck.deckType || pitchContext.deckType,
              targetRaise: deck.targetRaise || pitchContext.targetRaise,
            };
            
            if (deck.investorMode && deck.deckType) {
              setPitchContext(loadedContext);
            }
            
            // Generate Manus export for loaded deck
            generateManusExport(deck.slides, loadedContext);
            
            setViewState("slides");
          }
        }
      } catch (err) {
        console.error("Failed to load existing pitch deck:", err);
      }
    };
    
    loadExistingDeck();
  }, [ideaId, idea]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setUploadedPlan(text);
      toast({
        title: "Business Plan Uploaded",
        description: "Your refined business plan has been loaded.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Could not read the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateDeck = async () => {
    if (!ideaId) return;
    
    setViewState("generating");

    try {
      const analyzeResponse = await fetch("/api/ai/investor-pitch-deck/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          ideaId,
          uploadedPlan: uploadedPlan || undefined
        }),
      });

      if (!analyzeResponse.ok) {
        const error = await analyzeResponse.json();
        throw new Error(error.message || error.error || "Analysis failed");
      }

      const analysisData: AnalysisResponse = await analyzeResponse.json();
      setAnalysisResult(analysisData);

      const context: PitchContext = {
        startupName: analysisData.extractedContext.startupName || analysisData.ideaTitle,
        fundraisingStage: analysisData.analysis.fundraisingStage,
        targetRaise: analysisData.analysis.targetRaise,
        investorMode: analysisData.analysis.investorMode,
        deckType: analysisData.analysis.deckType,
        geography: analysisData.extractedContext.geography || "Global",
        problemStatement: analysisData.extractedContext.problemStatement,
        solutionStatement: analysisData.extractedContext.solutionStatement,
        currentTraction: analysisData.extractedContext.currentTraction,
        founderBackground: analysisData.extractedContext.founderBackground,
        businessPlanNotes: analysisData.extractedContext.keyInsights.join("\n• "),
      };
      setPitchContext(context);

      const response = await fetch("/api/ai/investor-pitch-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pitchContext: context, ideaId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate deck");
      }

      const data = await response.json();
      setSlides(data.slides);
      setMetricsValidation(data.metricsValidation || []);
      saveToHistory(data.slides, "Initial Generation");
      generateManusExport(data.slides, context);
      setViewState("slides");
      
      // Save to database
      try {
        const saveResponse = await fetch(`/api/ideas/${ideaId}/pitch-deck`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            investorMode: context.investorMode,
            deckType: context.deckType,
            targetRaise: context.targetRaise,
            slides: data.slides,
            metricsValidation: data.metricsValidation,
          }),
        });
        if (!saveResponse.ok) {
          const saveError = await saveResponse.json();
          console.error("Failed to save pitch deck:", saveError);
        }
      } catch (saveErr) {
        console.error("Failed to save pitch deck:", saveErr);
      }
      
      toast({
        title: "Pitch Deck Generated",
        description: `Your 11-slide pitch deck is ready for review.`,
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Please ensure your business plan has enough content.",
        variant: "destructive",
      });
      setViewState("ready");
    }
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
    generateManusExport(version.slides, pitchContext);
    setShowHistory(false);
    toast({
      title: "Version Restored",
      description: `Restored to: ${version.label}`,
    });
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
        credentials: "include",
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
      
      // Update metricsValidation if provided in response
      const updatedMetrics = data.metricsValidation || metricsValidation;
      if (data.metricsValidation) {
        setMetricsValidation(data.metricsValidation);
      }
      
      saveToHistory(data.slides, "After Investor-Proof Refinement");
      generateManusExport(data.slides, pitchContext);
      
      // Save refined deck to database
      try {
        await fetch(`/api/ideas/${ideaId}/pitch-deck`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            investorMode: pitchContext.investorMode,
            deckType: pitchContext.deckType,
            targetRaise: pitchContext.targetRaise,
            slides: data.slides,
            metricsValidation: updatedMetrics,
          }),
        });
      } catch (saveErr) {
        console.error("Failed to save refined pitch deck:", saveErr);
      }
      
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

  const generateManusExport = (slideData: SlideContent[], context: PitchContext) => {
    const maxBullets = 4;
    
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
    generateManusExport(slides.map((s, i) => editedContent[i] || s), pitchContext);
  };

  const renderLoadingView = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Loading your business plan...</p>
    </div>
  );

  const renderReadyView = () => (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/portal/ideas/${ideaId}`)}
          data-testid="button-back-to-idea"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Idea
        </Button>
      </div>
      
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Presentation className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Let's Build Your Pitch Deck</h1>
        <p className="text-muted-foreground">
          Your business plan is ready! AI will analyze it and create an investor-grade pitch deck.
        </p>
      </div>

      {businessPlanPreview.length > 0 ? (
        <Card className="mb-6 border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Business Plan Loaded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              {businessPlanPreview.slice(0, showMoreSections ? businessPlanPreview.length : 3).map((section, i) => (
                <p key={i} className="line-clamp-2">{section}</p>
              ))}
            </div>
            {businessPlanPreview.length > 3 && (
              <button
                onClick={() => setShowMoreSections(!showMoreSections)}
                className="text-sm text-primary flex items-center gap-1 mt-3 hover:underline"
                data-testid="button-toggle-sections"
              >
                {showMoreSections ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    + {businessPlanPreview.length - 3} more sections
                  </>
                )}
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              No Business Plan Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Complete your business plan first, or upload a refined version below.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="py-4">
          <p className="font-medium mb-3">AI will analyze your business plan and:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4 text-primary" />
              Determine if you should target Angel or VC investors
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4 text-primary" />
              Recommend optimal raise amount based on your stage
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="w-4 h-4 text-primary" />
              Extract key pitch elements automatically
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Presentation className="w-4 h-4 text-primary" />
              Generate investor-grade slide content
            </li>
          </ul>
        </CardContent>
      </Card>

      <Button
        onClick={generateDeck}
        size="lg"
        className="w-full mb-4"
        disabled={businessPlanPreview.length === 0 && !uploadedPlan}
        data-testid="button-generate-pitch-deck"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Generate Pitch Deck from Business Plan
      </Button>

      <div className="text-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".txt,.md,.doc,.docx,.pptx,.pdf"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 mx-auto"
          data-testid="button-upload-plan"
        >
          <Upload className="w-4 h-4" />
          Or upload a refined business plan instead
        </button>
        {uploadedPlan && (
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1 justify-center">
            <CheckCircle className="w-3 h-3" />
            Custom plan uploaded ({Math.round(uploadedPlan.length / 1000)}KB)
          </p>
        )}
      </div>
    </div>
  );

  const renderGeneratingView = () => (
    <div className="max-w-2xl mx-auto py-20 px-4 text-center">
      <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
      <h2 className="text-xl font-semibold mb-2">Creating Your Investor Pitch Deck</h2>
      <p className="text-muted-foreground mb-8">
        AI is analyzing your business plan and crafting compelling slides...
      </p>
      <div className="space-y-3 text-left max-w-md mx-auto">
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Reading business plan content</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Determining investor type and raise amount</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="w-4 h-4 rounded-full border-2 border-muted" />
          <span>Generating slide content</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="w-4 h-4 rounded-full border-2 border-muted" />
          <span>Creating metrics validation</span>
        </div>
      </div>
    </div>
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

  const renderSlidesView = () => (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewState("ready")}
            data-testid="button-back-to-ready"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Your Pitch Deck</h1>
            <p className="text-sm text-muted-foreground">
              {analysisResult && (
                <>
                  <Badge variant="outline" className="mr-2">
                    {pitchContext.investorMode === "angel" ? "Angel" : "VC"}
                  </Badge>
                  <Badge variant="outline" className="mr-2">
                    11 Slides
                  </Badge>
                  <Badge variant="outline">
                    {pitchContext.targetRaise}
                  </Badge>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setViewState("metrics")}
            data-testid="button-view-metrics"
          >
            <Target className="w-4 h-4 mr-2" />
            Metrics
          </Button>
          <Button
            variant="outline"
            onClick={() => setViewState("export")}
            data-testid="button-view-export"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export to Manus
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setViewState("ready");
              setSlides([]);
              setVersionHistory([]);
              setAnalysisResult(null);
              setPitchContext(prev => ({ ...prev, deckType: "full" }));
            }}
            data-testid="button-regenerate-deck"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
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
                Investor-Proof
              </>
            )}
          </Button>
          <Button
            variant="default"
            onClick={() => navigate(`/portal/pitch-preparation?ideaId=${ideaId}`)}
            data-testid="button-prepare-pitch"
          >
            <Mic className="w-4 h-4 mr-2" />
            Prepare Pitch
          </Button>
        </div>
      </div>

      {versionHistory.length > 0 && (
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs"
            data-testid="button-toggle-history"
          >
            <History className="w-3 h-3 mr-2" />
            Version History ({versionHistory.length})
          </Button>
          {showHistory && (
            <Card className="mt-2">
              <CardContent className="py-2">
                <div className="space-y-2 max-h-32 overflow-y-auto">
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
                      <Button variant="ghost" size="sm">Restore</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-200px)]">
        {slides.map((slide, index) => renderSlideCard(slide, index))}
        
        {/* Export to Manus CTA at end of slides */}
        <Card className="mt-6 border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Presentation className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Ready to Design Your Pitch Deck?</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  Export your slides to Manus for professional PowerPoint design. Manus will transform your content into a visually stunning investor-ready presentation.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setViewState("export")}
                data-testid="button-export-manus-cta"
              >
                <FileDown className="w-5 h-5 mr-2" />
                Export to Manus for Pitch Deck Design
              </Button>
            </div>
          </CardContent>
        </Card>
      </ScrollArea>
    </div>
  );

  const renderMetricsView = () => (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewState("slides")}
          data-testid="button-back-to-slides"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Metrics & Signal Validation</h1>
          <p className="text-sm text-muted-foreground">
            What investors will look for in each slide
          </p>
        </div>
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

      <div className="flex items-center gap-2 p-4 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-500" />
        <p className="text-sm">
          This table is for your reference only. No invented data should appear in your actual deck.
        </p>
      </div>
    </div>
  );

  const renderExportView = () => (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewState("slides")}
            data-testid="button-back-to-slides-from-export"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Manus Export</h1>
            <p className="text-sm text-muted-foreground">
              Copy and paste into Manus for slide design
            </p>
          </div>
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

      <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
        <p className="font-medium mb-2">How to create your pitch deck with Manus:</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Click <strong>"Copy for Manus"</strong> above to copy your slide content</li>
          <li>Click <strong>"Open Manus"</strong> or go to <a href="https://manus.im" target="_blank" rel="noopener noreferrer" className="text-primary underline" data-testid="link-manus-pitch-deck">manus.im</a></li>
          <li>Create a free account if you don't have one</li>
          <li>Paste the copied content and ask Manus to design your pitch deck</li>
          <li>Manus will create professional PowerPoint slides from your content</li>
        </ol>
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

      <div className="flex items-center gap-2 p-4 mt-4 bg-primary/10 border border-primary/20 rounded-lg">
        <Presentation className="w-5 h-5 text-primary" />
        <p className="text-sm">
          Manus will handle all visual design. This export contains only the content structure.
        </p>
      </div>

      <div className="flex justify-center mt-6">
        <Button
          size="lg"
          onClick={() => navigate(`/portal/ideas/${ideaId}`)}
          data-testid="button-complete-return-idea"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Complete & Return to Idea
        </Button>
      </div>
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
      case "slides":
        return renderSlidesView();
      case "metrics":
        return renderMetricsView();
      case "export":
        return renderExportView();
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
