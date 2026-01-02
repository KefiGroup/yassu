import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { 
  Lightbulb, 
  Target, 
  Users, 
  BarChart3, 
  FileText, 
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";

const workflowSteps = [
  {
    icon: Lightbulb,
    title: "Problem Extraction",
    description: "AI extracts the core problem you're solving from your idea submission",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: Target,
    title: "Solution Analysis",
    description: "Identifies your unique solution approach and value proposition",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users,
    title: "Target Users",
    description: "Maps out your ideal customer segments and user personas",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: BarChart3,
    title: "8 Workflow Analyses",
    description: "Runs comprehensive analyses across market, competition, and viability",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
];

const IdeaWorkflow = () => {
  return (
    <section id="idea-workflow" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-pink-300/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">AI-Powered Analysis</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What Happens <span className="text-gradient">Next</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Once you submit your idea, our AI gets to work immediately
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {workflowSteps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="glass border-border/50 p-6 h-full hover-elevate">
                <div className={`w-12 h-12 rounded-xl ${step.bgColor} flex items-center justify-center mb-4`}>
                  <step.icon className={`w-6 h-6 ${step.color}`} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="glass border-border/50 p-8 max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="text-center md:text-left flex-1">
                <h3 className="text-xl font-bold mb-2">Complete Business Plan</h3>
                <p className="text-muted-foreground mb-3">
                  Get a comprehensive business plan with market analysis, competitive landscape, 
                  revenue projections, and actionable next steps.
                </p>
                <div className="inline-flex items-center gap-2 text-primary font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Generated in ~2 minutes</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <ArrowRight className="w-8 h-8 text-muted-foreground/50" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default IdeaWorkflow;
