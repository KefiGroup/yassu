import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, Users, Rocket, ArrowRight } from "lucide-react";

const benefits = [
  {
    icon: Star,
    title: "Lead Your Campus",
    description: "Represent Yassu at your university and help fellow students launch their ventures.",
  },
  {
    icon: Users,
    title: "Build Your Network",
    description: "Connect with ambitious founders and builders across the national Yassu network.",
  },
  {
    icon: Rocket,
    title: "Shape the Future",
    description: "Help define how the next generation of companies are built, before capital decides who matters.",
  },
];

const Ambassadors = () => {
  return (
    <section id="ambassadors" className="py-24 relative">
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
            Yassu <span className="text-gradient">Ambassadors</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join our network of student leaders who are building the future of university entrepreneurship.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-amber-300/20 flex items-center justify-center mx-auto mb-6">
                <benefit.icon className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">{benefit.title}</h3>
              <p className="text-muted-foreground">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <Button variant="hero" size="xl" className="group">
            Become an Ambassador
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Ambassadors;
