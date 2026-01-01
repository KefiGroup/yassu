import { motion } from "framer-motion";
import { Sparkles, Users, Rocket, Building2, Crown, TrendingUp } from "lucide-react";

const coreFeatures = [
  {
    icon: Sparkles,
    title: "Free Access",
    description: "Verified club members and alumni get full platform access at no cost"
  },
  {
    icon: Users,
    title: "AI-Guided Workflows",
    description: "GPT-based agents guide you through structured mini-accelerator programs"
  },
  {
    icon: Rocket,
    title: "Publish & Collaborate",
    description: "Share ideas, join teams, or run simulations for practice"
  }
];

const monetization = [
  {
    icon: Building2,
    title: "Corporate Partnerships",
    description: "Sponsorships with innovation-driven corporations"
  },
  {
    icon: Crown,
    title: "Premium Tools",
    description: "Advanced features for professional founders and investors"
  },
  {
    icon: TrendingUp,
    title: "Selective Equity",
    description: "Strategic stakes in high-potential Yassu-born startups"
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
            Platform <span className="text-gradient">Model</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The LinkedIn × Notion × OpenAI for university founders — where human capital 
            becomes the new currency for venture creation.
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
              <h3 className="text-2xl font-bold text-foreground">Core Experience</h3>
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
              <h3 className="text-2xl font-bold text-foreground">Monetization</h3>
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
