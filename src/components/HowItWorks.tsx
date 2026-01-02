import { motion } from "framer-motion";
import { UserCheck, Lightbulb, Users, Rocket } from "lucide-react";

const steps = [
  {
    icon: UserCheck,
    title: "Join the Network",
    description: "Free access for members of recognized university clubs. Club-to-club connection with local accountability.",
  },
  {
    icon: Lightbulb,
    title: "Post or Find Ideas",
    description: "A two-sided marketplace: Ideas seeking builders, builders seeking meaningful companies.",
  },
  {
    icon: Users,
    title: "Form Execution-Ready Teams",
    description: "Cross-university talent liquidity. Match with peers who bring complementary skills and shared ambition.",
  },
  {
    icon: Rocket,
    title: "Build Real Companies",
    description: "Company formation is the goal. Funding is optional. Let execution determine what survives.",
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
            The <span className="text-gradient">Foundry</span> Model
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A foundry accepts many raw inputs, applies shared structure and discipline, 
            and produces fewer, stronger outcomes. Execution determines what survives.
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
              <div className="glass rounded-2xl p-6 h-full hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-pink-300/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-pink-300/30 transition-colors">
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
