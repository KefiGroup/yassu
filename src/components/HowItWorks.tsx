import { motion } from "framer-motion";
import { Lightbulb, FileText, Users, UsersRound, Wrench, Presentation, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Lightbulb,
    title: "Post an Idea (Yassu!)",
    description: "Explain what your idea is and what problem it solves.",
  },
  {
    icon: FileText,
    title: "Generate Business Plan",
    description: "Use the Yassu Agent to create a comprehensive business plan with market analysis and strategy.",
  },
  {
    icon: Users,
    title: "Find Advisors & Ambassadors",
    description: "Yassu will find matching Advisors and Ambassadors for your team invites.",
  },
  {
    icon: UsersRound,
    title: "Form Your Yassu Team",
    description: "Build your founding team with complementary skills and shared vision.",
  },
  {
    icon: Wrench,
    title: "Work on MVP",
    description: "Develop your minimum viable product with guidance from your team and advisors.",
  },
  {
    icon: Presentation,
    title: "Present in Yassu Foundry",
    description: "Showcase your progress and get feedback from the Yassu community.",
  },
  {
    icon: TrendingUp,
    title: "Seek Funding / Market Launch",
    description: "Take your company to market or pursue funding opportunities.",
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
            From idea to market launch, Yassu guides you through every step of building your university-native company.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
