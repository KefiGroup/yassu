import { motion } from "framer-motion";
import { UserCheck, Lightbulb, Users, Rocket } from "lucide-react";

const steps = [
  {
    icon: UserCheck,
    title: "Verify Your Club",
    description: "Free access for verified members of elite university clubs and their alumni networks.",
  },
  {
    icon: Lightbulb,
    title: "Explore & Ideate",
    description: "Our AI agents guide you through structured mini-accelerator workflows to refine your ideas.",
  },
  {
    icon: Users,
    title: "Build Your Team",
    description: "Match with peers who bring complementary skills from across connected university clubs.",
  },
  {
    icon: Rocket,
    title: "Launch & Scale",
    description: "Execute your go-to-market strategy with AI-driven planning and university resources.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/30 to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            How <span className="text-gradient">Yassu</span> Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From idea to launch, our platform guides you through every step of building your startup.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              <div className="glass rounded-2xl p-6 h-full hover:border-primary/30 transition-all duration-300 hover:glow-primary">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-purple-500/30 transition-colors">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-4xl font-bold text-muted-foreground/30 group-hover:text-primary/30 transition-colors">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
