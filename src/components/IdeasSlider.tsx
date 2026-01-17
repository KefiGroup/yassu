import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight, Lightbulb } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "react-router-dom";

interface FeaturedIdea {
  id: string;
  title: string;
  problem: string;
  stage: string;
  tags?: string[];
  creatorName?: string;
  coverImage?: string | null;
}

const sampleIdeas = [
  {
    id: "sample-1",
    title: "Foot Prints",
    problem: "Digital footprint tracking and analytics platform for businesses and individuals",
    stage: "idea_posted",
    tags: ["Tech"],
  },
  {
    id: "sample-2",
    title: "Trip-Sit for AI Hallucinations",
    problem: "AI safety monitoring for healthcare applications to prevent misinformation",
    stage: "idea_posted",
    tags: ["Healthcare"],
  },
  {
    id: "sample-3",
    title: "User-based App Privacy T&C's",
    problem: "Simplified privacy terms generator for apps that users can actually understand",
    stage: "idea_posted",
    tags: ["Tech"],
  },
  {
    id: "sample-4",
    title: "Dating App Through Therapy",
    problem: "Relationship building through guided communication and therapy techniques",
    stage: "idea_posted",
    tags: ["Social"],
  },
  {
    id: "sample-5",
    title: "Campus Marketplace",
    problem: "Peer-to-peer marketplace for university students to buy and sell items",
    stage: "idea_posted",
    tags: ["Education"],
  },
  {
    id: "sample-6",
    title: "Sustainable Fashion AI",
    problem: "AI-powered sustainable wardrobe recommendations to reduce fashion waste",
    stage: "idea_posted",
    tags: ["Sustainability"],
  },
];

const stageColors: { [key: string]: string } = {
  idea_posted: "bg-primary",
  business_plan: "bg-blue-500",
  find_advisors: "bg-purple-500",
  form_team: "bg-violet-500",
  build_mvp: "bg-orange-500",
  yassu_foundry: "bg-pink-500",
  seek_funding: "bg-emerald-500",
};

const IdeasSlider = () => {
  const [featuredIdeas, setFeaturedIdeas] = useState<FeaturedIdea[]>([]);
  const [loading, setLoading] = useState(true);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    const fetchFeaturedIdeas = async () => {
      try {
        const response = await fetch('/api/ideas/featured');
        if (response.ok) {
          const data = await response.json();
          setFeaturedIdeas(data);
        }
      } catch (error) {
        console.error('Error fetching featured ideas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedIdeas();
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const ideasToShow = featuredIdeas.length > 0 ? featuredIdeas : sampleIdeas;
  const showingSamples = featuredIdeas.length === 0;

  return (
    <section id="ideas" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {showingSamples ? 'Sample of' : 'Featured'} <span className="text-gradient">Yassu Ideas</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover innovative startup concepts from university founders across the nation
          </p>
        </motion.div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {ideasToShow.map((idea, index) => (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex-shrink-0 w-[280px] md:w-[320px]"
                >
                  <Card className="glass border-border/50 overflow-hidden h-full hover-elevate">
                    <div className="relative">
                      <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      </div>
                      {idea.coverImage ? (
                        <div className="w-full h-48 overflow-hidden">
                          <img 
                            src={idea.coverImage} 
                            alt={idea.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-primary/20 via-pink-500/10 to-violet-500/20 flex items-center justify-center">
                          <Lightbulb className="w-16 h-16 text-primary/40" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 space-y-3">
                      <Badge className={`${stageColors[idea.stage] || 'bg-primary'} text-white border-0`}>
                        {idea.tags?.[0] || idea.stage?.replace(/_/g, ' ') || 'Idea'}
                      </Badge>
                      <h3 className="font-semibold text-lg leading-tight text-foreground">
                        {idea.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {idea.problem}
                      </p>
                      {showingSamples ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                          Sample Idea
                        </span>
                      ) : (
                        <Link
                          to={`/portal/ideas/${idea.id}`}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors group"
                          data-testid={`link-idea-${idea.id}`}
                        >
                          View Idea
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 glass border-border/50 rounded-full z-10 shadow-lg"
            onClick={scrollPrev}
            data-testid="button-slider-prev"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 glass border-border/50 rounded-full z-10 shadow-lg"
            onClick={scrollNext}
            data-testid="button-slider-next"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default IdeasSlider;
