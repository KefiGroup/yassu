import { motion } from "framer-motion";
import { Lightbulb, Users, TrendingUp } from "lucide-react";

const ideas = [
  {
    icon: Lightbulb,
    title: "Post Your Ideas",
    description: "Share your startup concepts with the community. Get feedback, find co-founders, and validate before you build.",
  },
  {
    icon: Users,
    title: "Find Builders",
    description: "Connect with talented students across universities who have the skills to bring your vision to life.",
  },
  {
    icon: TrendingUp,
    title: "Build Together",
    description: "Form execution-ready teams and turn ideas into real companies with structured collaboration.",
  },
];

const Ideas = () => {
  return (
    <section id="ideas" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 via-transparent to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Yassu <span className="text-gradient">Ideas</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A two-sided marketplace where ideas find builders and builders find meaningful companies to build.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {ideas.map((idea, index) => (
            <motion.div
              key={idea.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-pink-300/20 flex items-center justify-center mx-auto mb-6">
                <idea.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">{idea.title}</h3>
              <p className="text-muted-foreground">{idea.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Ideas;
