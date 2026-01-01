import { motion } from "framer-motion";
import { Target, Globe, Handshake } from "lucide-react";

const phases = [
  {
    phase: "Phase 1",
    title: "Pilot Launch",
    description: "Partner with 5 elite universities to validate the platform and refine our AI workflows.",
    universities: ["UCLA", "UC Berkeley", "MIT", "Harvard", "Northwestern"],
    icon: Target,
    color: "primary"
  },
  {
    phase: "Phase 2",
    title: "National Expansion",
    description: "Scale to 20-30 university clubs across the country, building a robust founder network.",
    universities: ["Columbia", "Yale", "Princeton", "Stanford", "Carnegie Mellon"],
    icon: Globe,
    color: "accent"
  },
  {
    phase: "Phase 3",
    title: "Strategic Partnerships",
    description: "Introduce selective equity participation and partner with leading accelerators.",
    universities: ["Partner Accelerators", "Corporate Innovation Labs", "VC Networks"],
    icon: Handshake,
    color: "pink-400"
  }
];

const LaunchStrategy = () => {
  return (
    <section id="launch" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Launch <span className="text-gradient">Strategy</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A phased approach to building the world's most powerful university founder network.
          </p>
        </motion.div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-accent/50 to-pink-400/50 hidden md:block" />
          
          <div className="space-y-12">
            {phases.map((phase, index) => (
              <motion.div
                key={phase.phase}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className={`flex flex-col md:flex-row items-center gap-8 ${
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Content Card */}
                <div className="flex-1">
                  <div className="glass rounded-3xl p-8 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                        {phase.phase}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">{phase.title}</h3>
                    <p className="text-muted-foreground mb-4">{phase.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {phase.universities.map((uni) => (
                        <span
                          key={uni}
                          className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {uni}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline Node */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${phase.color}/20 to-${phase.color}/10 flex items-center justify-center border-2 border-${phase.color}/30 shadow-lg`}>
                    <phase.icon className={`w-8 h-8 text-${phase.color}`} />
                  </div>
                </div>

                {/* Spacer for alternating layout */}
                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LaunchStrategy;
