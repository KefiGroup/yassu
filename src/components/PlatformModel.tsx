import { motion } from "framer-motion";
import { Sparkles, Users, Rocket, Building2, Crown, TrendingUp } from "lucide-react";

const coreFeatures = [
  {
    icon: Sparkles,
    title: "From Facebook",
    description: "Identity anchored in real institutions. Trust derived from membership and affiliation."
  },
  {
    icon: Users,
    title: "From Y Combinator",
    description: "Company creation as the unit of value. Structured workflows for evaluation and growth."
  },
  {
    icon: Rocket,
    title: "What's New",
    description: "Talent exchange replaces early capital. Contribution and execution determine influence."
  }
];

const monetization = [
  {
    icon: Building2,
    title: "Not a Social Network",
    description: "Not optimizing for engagement or vanity metrics. Only companies that actually ship."
  },
  {
    icon: Crown,
    title: "Not an Accelerator",
    description: "No demo days. No pitch competitions. Execution-focused company formation."
  },
  {
    icon: TrendingUp,
    title: "Democratization Without Lowering the Bar",
    description: "AI equalizes the starting line. Rigor and execution determine the outcome."
  }
];

const PlatformModel = () => {
  return (
    <section id="platform" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 via-transparent to-secondary/30" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Facebook × YC, <span className="text-gradient">Rebuilt</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Combining the network effects of early Facebook with the company-building discipline of Y Combinator,
            powered by AI that makes early capital optional, not prerequisite.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Core Experience */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-pink-300/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">The Marketplace Model</h3>
            </div>
            
            <div className="space-y-4">
              {coreFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex gap-4 p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Monetization */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-amber-300/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">What Yassu Is Not</h3>
            </div>
            
            <div className="space-y-4">
              {monetization.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex gap-4 p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PlatformModel;
