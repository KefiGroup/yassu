import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight, Lightbulb } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingContext";

interface FeaturedIdea {
  id: string;
  title: string;
  problem: string;
  stage: string;
  tags?: string[];
  creatorName?: string;
  coverImage?: string | null;
}



const IdeasSlider = () => {
  const brand = useBranding();
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
        const brandParam = brand.id !== 'yassu' ? `?brand=${encodeURIComponent(brand.id)}` : '';
        const response = await fetch(`/api/ideas/featured${brandParam}`);
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

  const ideasToShow = featuredIdeas;

  return (
    <section id="ideas" className="py-24 relative overflow-hidden scroll-mt-32">
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
            {brand.sectionHeadings.ideasTitle[0]}<span className="text-gradient">{brand.sectionHeadings.ideasTitle[1]}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover innovative startup concepts from university founders across the nation
          </p>
        </motion.div>

        {ideasToShow.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-16 px-6"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 via-pink-500/10 to-violet-500/20 flex items-center justify-center mb-6">
              <Lightbulb className="w-10 h-10 text-primary/60" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">1K Pitch Ideas</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Be among the first to pitch your startup idea. Sign up and post your idea to get featured here!
            </p>
          </motion.div>
        ) : (
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
                      <h3 className="font-semibold text-lg leading-tight text-foreground">
                        {idea.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {idea.problem}
                      </p>
                      <Link
                        to={`/portal/ideas/${idea.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors group"
                        data-testid={`link-idea-${idea.id}`}
                      >
                        View Idea
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Link>
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
        )}
      </div>
    </section>
  );
};

export default IdeasSlider;
