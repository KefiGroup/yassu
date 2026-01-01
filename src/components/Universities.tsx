import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

// Phase 1 pilot universities from the game plan
const pilotUniversities = [
  { name: "UCLA", phase: "Pilot", highlight: true },
  { name: "UC Berkeley", phase: "Pilot", highlight: true },
  { name: "MIT", phase: "Pilot", highlight: true },
  { name: "Harvard", phase: "Pilot", highlight: true },
  { name: "Northwestern", phase: "Pilot", highlight: true },
];

const expansionUniversities = [
  { name: "Stanford", phase: "Phase 2" },
  { name: "Columbia", phase: "Phase 2" },
  { name: "Yale", phase: "Phase 2" },
  { name: "Princeton", phase: "Phase 2" },
  { name: "Carnegie Mellon", phase: "Phase 2" },
];

const Universities = () => {
  return (
    <section id="universities" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Elite <span className="text-gradient">University Network</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tier-1 university clubs represent the densest network of top-of-class innovators,
            with acceptance rates often lower than the universities themselves.
          </p>
        </motion.div>

        {/* Pilot Universities - Featured */}
        <div className="mb-8">
          <p className="text-sm text-primary font-medium text-center mb-4">Phase 1 Pilot Partners</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {pilotUniversities.map((uni, index) => (
              <motion.div
                key={uni.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="glass rounded-2xl p-6 text-center border-primary/30 hover:border-primary/50 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/20"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/20 to-pink-300/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-pink-300/30 transition-colors">
                  <GraduationCap className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">{uni.name}</h3>
                <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">
                  {uni.phase}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Expansion Universities */}
        <div>
          <p className="text-sm text-muted-foreground font-medium text-center mb-4">Coming in Phase 2</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {expansionUniversities.map((uni, index) => (
              <motion.div
                key={uni.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 + 0.25 }}
                className="glass rounded-2xl p-5 text-center hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-secondary/50 flex items-center justify-center group-hover:bg-secondary transition-colors">
                  <GraduationCap className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{uni.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {uni.phase}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 glass rounded-2xl p-8 md:p-12 text-center"
        >
          <p className="text-sm text-primary font-medium mb-2">Market Opportunity</p>
          <p className="text-2xl md:text-3xl font-semibold text-foreground max-w-3xl mx-auto">
            Traditional recruiters bypass these clubs, creating a{" "}
            <span className="text-gradient">massive untapped pipeline</span> of motivated 
            founders and collaborators.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Universities;
