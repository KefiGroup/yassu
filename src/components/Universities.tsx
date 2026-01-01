import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

const universities = [
  { name: "MIT", phase: "Phase 1" },
  { name: "Harvard", phase: "Phase 1" },
  { name: "Stanford", phase: "Phase 1" },
  { name: "UC Berkeley", phase: "Phase 1" },
  { name: "UCLA", phase: "Phase 1" },
  { name: "Northwestern", phase: "Phase 2" },
  { name: "Columbia", phase: "Phase 2" },
  { name: "Yale", phase: "Phase 2" },
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {universities.map((uni, index) => (
            <motion.div
              key={uni.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="glass rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300 group hover:glow-primary"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center group-hover:from-primary/20 group-hover:to-purple-500/20 transition-colors">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">{uni.name}</h3>
              <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary">
                {uni.phase}
              </span>
            </motion.div>
          ))}
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
