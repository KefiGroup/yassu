import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, ExternalLink, Star, Lightbulb, Target, Users, 
  Rocket, DollarSign, TrendingUp, Compass, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Resource {
  name: string;
  url: string;
  description: string;
  bestFor: string;
  highlights?: string[];
  featured?: boolean;
}

interface JourneyStage {
  id: string;
  title: string;
  description: string;
  icon: any;
  resources: Resource[];
}

const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Foundational knowledge for first-time founders",
    icon: Compass,
    resources: [
      {
        name: "Y Combinator Startup School",
        url: "https://www.startupschool.org/",
        description: "Free online course on how to start a startup, taught by YC partners and industry leaders. Covers MVP planning, startup funding, launching, user growth, and team leadership.",
        bestFor: "Early-stage idea validation and founder education",
        highlights: ["7-week program", "1-2 hours/week", "Co-founder matching (100K+ matches)"],
      },
      {
        name: "Stanford d.school Design Thinking",
        url: "https://dschool.stanford.edu/",
        description: "Design Thinking Bootleg with introductory tools and methods. Includes starter kits and design workshop activities for innovation and problem-solving.",
        bestFor: "Product ideation and user-centered problem solving",
      },
      {
        name: "IDEO Design Thinking",
        url: "https://designthinking.ideo.com/",
        description: "Comprehensive design thinking methodology with a human-centered problem-solving approach.",
        bestFor: "Understanding customer needs and rapid prototyping",
      },
      {
        name: "Founder Institute",
        url: "https://fi.co/",
        description: "Nearly 1,000 free startup events per year. Network with local entrepreneurs, investors, and learn from experienced advisors.",
        bestFor: "Local community building and networking",
        highlights: ["1,000 free events/year"],
      },
      {
        name: "Business Model Canvas",
        url: "https://www.strategyzer.com/",
        description: "Official template from Strategyzer for visualizing business model components. Free downloadable PDF available.",
        bestFor: "Visualizing business model components",
      },
      {
        name: "Lean Canvas",
        url: "https://neoschronos.com/download/lean-canvas/",
        description: "One-page business plan focused on problem/solution fit. Available in Word, Notion, and other formats with CC BY-SA 4.0 license.",
        bestFor: "Rapid iteration and early-stage validation",
      },
    ],
  },
  {
    id: "building-your-idea",
    title: "Building Your Idea",
    description: "Validate and refine your startup concept",
    icon: Lightbulb,
    resources: [
      {
        name: "IdeaProof",
        url: "https://ideaproof.io/",
        description: "AI-powered startup idea validator with instant market analysis and competitor research. Validates ideas in 120 seconds.",
        bestFor: "Quick idea validation",
        highlights: ["AI-powered", "120-second validation"],
      },
      {
        name: "ValidatorAI",
        url: "https://validatorai.com/",
        description: "AI tool for value proposition development, competition analysis, and customer identification.",
        bestFor: "Business idea validation",
      },
      {
        name: "Figma",
        url: "https://www.figma.com/solutions/mvp-builder/",
        description: "MVP Builder for turning ideas into testable prototypes. Features AI-powered product design, user flow capture, and logic validation.",
        bestFor: "UI/UX design and rapid prototyping",
      },
      {
        name: "Value Proposition Canvas",
        url: "https://www.strategyzer.com/library/the-value-proposition-canvas",
        description: "Complements Business Model Canvas with a focus on customer needs and value delivery.",
        bestFor: "Product-market fit validation",
      },
      {
        name: "Startup Project Market Maps",
        url: "https://startupproject.org/market-maps/",
        description: "41+ tools for customer research and validation with comprehensive market analysis resources.",
        bestFor: "Understanding market landscape",
        highlights: ["41+ tools"],
      },
      {
        name: "ChatGPT & Claude for Research",
        url: "https://chat.openai.com/",
        description: "AI-powered tools for rapid research, content generation, and ideation. Use for brainstorming, competitive analysis, and drafting business content.",
        bestFor: "Rapid research and content generation",
        highlights: ["AI-powered"],
      },
    ],
  },
  {
    id: "planning-strategy",
    title: "Planning & Strategy",
    description: "Structure your business plan and operations",
    icon: Target,
    resources: [
      {
        name: "LivePlan",
        url: "https://www.liveplan.com/",
        description: "Business planning, forecasting, and financial management used by 1M+ small businesses. Includes financial projections and performance tracking.",
        bestFor: "Comprehensive business planning with financials",
        highlights: ["1M+ businesses use it"],
      },
      {
        name: "Notion",
        url: "https://www.notion.so/",
        description: "All-in-one workspace with many free startup templates available. Free for students.",
        bestFor: "Documentation, knowledge management, and project tracking",
        highlights: ["Free for students"],
      },
      {
        name: "SBA Business Plan Guide",
        url: "https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan",
        description: "Free business plan templates and government-backed guidance from the U.S. Small Business Administration.",
        bestFor: "Foundational business planning",
      },
      {
        name: "Airtable",
        url: "https://airtable.com/",
        description: "Database and project management combined. Flexible for various use cases with a free tier available.",
        bestFor: "Organizing complex data and workflows",
      },
      {
        name: "Trello",
        url: "https://trello.com/",
        description: "Visual project management with a free tier available for team task tracking and workflow management.",
        bestFor: "Team task tracking and workflow",
      },
    ],
  },
  {
    id: "finding-your-team",
    title: "Finding Your Team",
    description: "Connect with mentors, co-founders, and supporters",
    icon: Users,
    resources: [
      {
        name: "SCORE",
        url: "https://www.score.org/",
        description: "Free business mentorship from 11,000+ volunteer mentors. Available in-person, via email, telephone, and video. Expertise in financing, HR, and business planning.",
        bestFor: "One-on-one mentorship and guidance",
        highlights: ["11,000+ mentors", "Free"],
      },
      {
        name: "Startup Grind",
        url: "https://www.startupgrind.com/",
        description: "Global community in 120+ countries offering education, connections, and opportunities for entrepreneurs.",
        bestFor: "Local and global networking",
        highlights: ["120+ countries"],
      },
      {
        name: "Founders Network",
        url: "https://foundersnetwork.com/",
        description: "Peer support from experienced founders with 100+ annual in-person and virtual events.",
        bestFor: "Founder-to-founder guidance and accountability",
        highlights: ["100+ events/year"],
      },
      {
        name: "Meetup - Entrepreneur Networking",
        url: "https://www.meetup.com/topics/business-entrepreneur-networking/",
        description: "Local networking groups and events. Free to join and attend many events.",
        bestFor: "Building local founder community",
      },
      {
        name: "Indie Hackers",
        url: "https://www.indiehackers.com/",
        description: "Peer support and accountability groups where members share advice and experiences.",
        bestFor: "Indie founders and bootstrapped startups",
      },
      {
        name: "Reddit Communities",
        url: "https://www.reddit.com/r/startups/",
        description: "Free peer support and Q&A through r/startups and r/Entrepreneur communities.",
        bestFor: "Community advice and shared experiences",
      },
    ],
  },
  {
    id: "launching-mvp",
    title: "Launching Your MVP",
    description: "Build and ship your minimum viable product",
    icon: Rocket,
    resources: [
      {
        name: "Manus - Integrated MVP Builder",
        url: "https://manus.im/",
        description: "AI-powered MVP development platform. Build fully functional prototypes and MVPs including web applications, mobile apps, and complex workflows. Enterprise-grade capabilities for turning validated ideas into working products.",
        bestFor: "Turning validated ideas into working prototypes and launch-ready MVPs",
        highlights: ["AI-powered", "Web & mobile apps", "Primary MVP tool"],
        featured: true,
      },
      {
        name: "Figma for Design",
        url: "https://www.figma.com/",
        description: "Design and prototype tool for refining UI/UX before development. Complements Manus for the design phase.",
        bestFor: "UI/UX design refinement",
      },
      {
        name: "Webflow",
        url: "https://webflow.com/",
        description: "Design-first website builder with no-code development capabilities.",
        bestFor: "Building landing pages and web applications",
      },
      {
        name: "Adalo",
        url: "https://www.adalo.com/",
        description: "Mobile-first no-code app builder for creating mobile app prototypes.",
        bestFor: "Creating mobile app prototypes",
      },
      {
        name: "Bubble",
        url: "https://bubble.io/",
        description: "Complex web app development without coding. Build functional web applications.",
        bestFor: "Building functional web applications",
      },
      {
        name: "Glide",
        url: "https://www.glideapps.com/",
        description: "No-code app builder for iOS and Android. Quick mobile app creation.",
        bestFor: "Quick mobile app creation",
      },
      {
        name: "Zapier",
        url: "https://zapier.com/",
        description: "Workflow automation and integration for connecting different tools and automating processes.",
        bestFor: "Connecting tools and automating workflows",
      },
    ],
  },
  {
    id: "funding-pitch",
    title: "Funding & Pitch",
    description: "Secure funding and master your pitch",
    icon: DollarSign,
    resources: [
      {
        name: "VentureWell E-Team Grant Program",
        url: "https://venturewell.org/e-team/",
        description: "$5K and $20K grants for multi-disciplinary student teams working on ventures with social impact.",
        bestFor: "Student-led ventures with social impact",
        highlights: ["$5K-$20K grants"],
      },
      {
        name: "Northwestern VentureCat",
        url: "https://www.venturecat.northwestern.edu/",
        description: "$100,000+ in non-dilutive prize money through pitch competition for student ventures.",
        bestFor: "Student entrepreneurs seeking pitch competitions",
        highlights: ["$100K+ in prizes"],
      },
      {
        name: "Leadership Circle Competitions",
        url: "https://www.theleadershipcircle.com/",
        description: "Free programming, mentoring, and $400,000+ in non-dilutive funding available for emerging entrepreneurs.",
        bestFor: "Emerging entrepreneurs seeking non-dilutive capital",
        highlights: ["$400K+ available", "Free mentoring"],
      },
      {
        name: "Rice Business Plan Competition",
        url: "https://rbpc.rice.edu/",
        description: "Opportunity through major business plan competitions for comprehensive venture presentations.",
        bestFor: "Comprehensive business plan competitions",
      },
      {
        name: "The Holloway Guide to Raising VC",
        url: "https://www.holloway.com/g/venture-capital/",
        description: "Comprehensive resource with technical detail, practical knowledge, real-world scenarios, and pitfalls to avoid.",
        bestFor: "Understanding the VC fundraising process",
      },
      {
        name: "Pitch Perfect: Guide for Young Founders",
        url: "https://hgventures.com/pitch-perfect-a-guide-for-young-founders-presenting-to-vcs/",
        description: "Guidance on presenting to VCs, covering pitch deck development and investor relations.",
        bestFor: "Pitch deck development and investor relations",
      },
      {
        name: "SBA Grants",
        url: "https://www.sba.gov/funding-programs/grants",
        description: "Government grants for entrepreneurs through nonprofits and educational organizations.",
        bestFor: "Non-dilutive funding opportunities",
      },
    ],
  },
  {
    id: "growing-startup",
    title: "Growing Your Startup",
    description: "Scale your operations, marketing, and team",
    icon: TrendingUp,
    resources: [
      {
        name: "Canva",
        url: "https://canva.com/",
        description: "Design tool for marketing materials including pitch decks, social media content, and graphics. Free tier available.",
        bestFor: "Creating pitch decks, social content, and graphics",
      },
      {
        name: "Buffer",
        url: "https://buffer.com/",
        description: "Social media management with planning and scheduling for social posts. Free tier available.",
        bestFor: "Planning and scheduling social posts",
      },
      {
        name: "Mailchimp",
        url: "https://mailchimp.com/",
        description: "Email marketing automation with a free tier for small lists. Build your email subscriber base.",
        bestFor: "Building email subscriber base",
      },
      {
        name: "Zoom",
        url: "https://zoom.us/",
        description: "Video conferencing with a free tier for team meetings and investor calls.",
        bestFor: "Team meetings and investor calls",
      },
      {
        name: "Calendly",
        url: "https://calendly.com/",
        description: "Schedule management and meeting coordination with a free tier available.",
        bestFor: "Streamlining meeting scheduling",
      },
    ],
  },
];

export default function Resources() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const filteredStages = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    return JOURNEY_STAGES
      .filter(stage => !activeStage || stage.id === activeStage)
      .map(stage => ({
        ...stage,
        resources: stage.resources.filter(resource => {
          if (!term) return true;
          return (
            resource.name.toLowerCase().includes(term) ||
            resource.description.toLowerCase().includes(term) ||
            resource.bestFor.toLowerCase().includes(term) ||
            resource.highlights?.some(h => h.toLowerCase().includes(term))
          );
        }),
      }))
      .filter(stage => stage.resources.length > 0);
  }, [searchTerm, activeStage]);

  const totalResources = JOURNEY_STAGES.reduce((sum, s) => sum + s.resources.length, 0);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-resources-title">Startup Resources</h1>
        <p className="text-muted-foreground">
          {totalResources} curated tools and resources to help you at every stage of your founder journey
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="space-y-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources by name, topic, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-resources"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeStage === null ? "default" : "outline"}
            onClick={() => setActiveStage(null)}
            data-testid="button-filter-all"
          >
            All Stages
          </Button>
          {JOURNEY_STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <Button
                key={stage.id}
                variant={activeStage === stage.id ? "default" : "outline"}
                onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}
                className="gap-1.5"
                data-testid={`button-filter-${stage.id}`}
              >
                <Icon className="h-4 w-4" />
                {stage.title}
              </Button>
            );
          })}
        </div>
      </motion.div>

      {filteredStages.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
          data-testid="text-no-resources"
        >
          <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No resources found</h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search or filter to find what you're looking for
          </p>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {filteredStages.map((stage, stageIndex) => {
            const StageIcon = stage.icon;
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 * stageIndex }}
              >
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <StageIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{stage.title}</h2>
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    {stage.resources.length} {stage.resources.length === 1 ? 'resource' : 'resources'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stage.resources.map((resource, index) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover-elevate rounded-md"
                      data-testid={`link-resource-${stage.id}-${index}`}
                    >
                      <Card className={`h-full ${resource.featured ? 'border-primary/40 bg-primary/[0.03]' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm font-semibold leading-tight flex items-center gap-2">
                              {resource.featured && <Star className="h-4 w-4 text-primary shrink-0 fill-primary" />}
                              {resource.name}
                            </CardTitle>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          </div>
                          {resource.featured && (
                            <Badge variant="default" className="w-fit">
                              Featured
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {resource.description}
                          </p>

                          {resource.highlights && resource.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {resource.highlights.map((highlight, i) => (
                                <Badge key={i} variant="secondary">
                                  {highlight}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 pt-1">
                            <Zap className="h-3 w-3 text-primary shrink-0" />
                            <span className="text-xs text-muted-foreground leading-tight">
                              {resource.bestFor}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
