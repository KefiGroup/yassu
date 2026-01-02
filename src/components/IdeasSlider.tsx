import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

const sampleIdeas = [
  {
    id: 1,
    title: "Foot Prints",
    category: "Tech",
    categoryColor: "bg-cyan-500",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop",
    description: "Digital footprint tracking and analytics platform",
  },
  {
    id: 2,
    title: "Trip-Sit for AI Hallucinations",
    category: "Healthcare",
    categoryColor: "bg-fuchsia-500",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop",
    description: "AI safety monitoring for healthcare applications",
  },
  {
    id: 3,
    title: "User-based App Privacy T&C's",
    category: "Tech",
    categoryColor: "bg-cyan-500",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop",
    description: "Simplified privacy terms generator for apps",
  },
  {
    id: 4,
    title: "Dating App Through Therapy",
    category: "Social",
    categoryColor: "bg-violet-500",
    image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&h=300&fit=crop",
    description: "Relationship building through guided communication",
  },
  {
    id: 5,
    title: "Campus Marketplace",
    category: "Education",
    categoryColor: "bg-emerald-500",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop",
    description: "Peer-to-peer marketplace for university students",
  },
  {
    id: 6,
    title: "Sustainable Fashion AI",
    category: "Sustainability",
    categoryColor: "bg-green-500",
    image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&h=300&fit=crop",
    description: "AI-powered sustainable wardrobe recommendations",
  },
];

const IdeasSlider = () => {
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

  return (
    <section id="ideas-slider" className="py-24 bg-zinc-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Sample of <span className="text-cyan-400">Yassu Ideas</span>
          </h2>
        </motion.div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {sampleIdeas.map((idea, index) => (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex-shrink-0 w-[280px] md:w-[300px]"
                >
                  <Card className="bg-zinc-800 border-zinc-700 overflow-hidden h-full">
                    <div className="relative">
                      <div className="absolute top-2 left-2 flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-zinc-600" />
                        <div className="w-2 h-2 rounded-full bg-zinc-600" />
                        <div className="w-2 h-2 rounded-full bg-zinc-600" />
                      </div>
                      <img
                        src={idea.image}
                        alt={idea.title}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                    <div className="p-4 space-y-3">
                      <Badge className={`${idea.categoryColor} text-white border-0`}>
                        {idea.category}
                      </Badge>
                      <h3 className="text-white font-semibold text-lg leading-tight">
                        {idea.title}
                      </h3>
                      <a
                        href="#"
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-sm transition-colors group"
                        data-testid={`link-read-more-${idea.id}`}
                      >
                        Read More
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 rounded-full z-10"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            data-testid="button-slider-prev"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 rounded-full z-10"
            onClick={scrollNext}
            disabled={!canScrollNext}
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
