import { motion } from "framer-motion";
import { 
  Lightbulb, 
  Search, 
  Shield, 
  Palette, 
  Users, 
  Rocket, 
  Building2, 
  Presentation 
} from "lucide-react";

const agents = [
  {
    icon: Lightbulb,
    name: "Idea & Founder Fit",
    purpose: "Refine business ideas based on your interests, studies, and strengths",
    outputs: "Problem statement, founder motivation map, initial hypothesis",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Search,
    name: "Competitive Landscape",
    purpose: "AI-driven market and competitor scans using public datasets",
    outputs: "Market map, competitor grid, whitespace identification",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    name: "Risk & Moat Builder",
    purpose: "Identify execution risks, regulatory hurdles, and moat design",
    outputs: "SWOT + moat report, risk mitigation plan, defensibility score",
    color: "from-emerald-500 to-green-500",
  },
  {
    icon: Palette,
    name: "Product & MVP Design",
    purpose: "Translate ideas into tangible MVP plans with scope and roadmap",
    outputs: "Feature backlog, MVP spec, Figma-ready prompt file",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Users,
    name: "Team & Talent",
    purpose: "Match with peers who bring complementary skills",
    outputs: "Team skill matrix, personality matching, invite list",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: Rocket,
    name: "Launch Plan",
    purpose: "Build actionable go-to-market plans with metrics",
    outputs: "Marketing calendar, channel strategy, launch checklist",
    color: "from-rose-500 to-red-500",
  },
  {
    icon: Building2,
    name: "School Advantage",
    purpose: "Leverage your university's labs, incubators, grants, and alumni",
    outputs: "Resources list, contact templates, school roadmap",
    color: "from-teal-500 to-emerald-500",
  },
  {
    icon: Presentation,
    name: "Funding & Pitch",
    purpose: "Create pitch decks and identify non-dilutive grants",
    outputs: "One-page pitch, grant database, investor templates",
    color: "from-yellow-500 to-amber-500",
  },
];

const AgentsSection = () => {
  return (
    <section id="agents" className="py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-300/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            8 AI Agents, One <span className="text-gradient">Mission</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Each workflow is a self-contained AI agent guiding you step-by-step through startup formation 
            with contextual awareness of your school, major, and peers.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group"
            >
              <div className="glass rounded-2xl p-5 h-full hover:border-primary/30 transition-all duration-300 cursor-pointer hover:-translate-y-1">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <agent.icon className="w-5 h-5 text-background" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{agent.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{agent.purpose}</p>
                <div className="pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground/80">
                    <span className="text-primary font-medium">Outputs:</span> {agent.outputs}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AgentsSection;
