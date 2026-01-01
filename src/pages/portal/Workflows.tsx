import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Search,
  Shield,
  FileText,
  Users,
  Rocket,
  GraduationCap,
  DollarSign,
  ArrowRight,
  Play,
} from 'lucide-react';

const workflows = [
  {
    id: 'idea_founder_fit',
    title: 'Idea & Founder Fit',
    description: 'Analyze your alignment with the problem you\'re solving and map your motivations.',
    icon: Sparkles,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    outputs: ['Problem statement', 'Founder motivation map', 'Initial hypothesis'],
  },
  {
    id: 'competitive_landscape',
    title: 'Competitive Landscape',
    description: 'Scan the market, identify competitors, and find whitespace opportunities.',
    icon: Search,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    outputs: ['Market map', 'Competitor grid', 'Whitespace analysis'],
  },
  {
    id: 'risk_moat_builder',
    title: 'Risk & Moat Builder',
    description: 'Identify risks, build defensibility, and score your competitive moat.',
    icon: Shield,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    outputs: ['SWOT + moat report', 'Risk mitigation plan', 'Defensibility score'],
  },
  {
    id: 'product_mvp_design',
    title: 'Product & MVP Design',
    description: 'Design your product roadmap, feature backlog, and MVP specification.',
    icon: FileText,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    outputs: ['Feature backlog', 'MVP spec', 'Milestones', 'Figma-ready prompts'],
  },
  {
    id: 'team_talent',
    title: 'Team & Talent',
    description: 'Map skills needed, assess team fit, and get teammate recommendations.',
    icon: Users,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    outputs: ['Skill matrix', 'Personality fit notes', 'Invite recommendations'],
  },
  {
    id: 'launch_plan',
    title: 'Launch Plan',
    description: 'Create your go-to-market strategy with channels, timeline, and metrics.',
    icon: Rocket,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    outputs: ['Marketing calendar', 'Channel strategy', 'Launch checklist'],
  },
  {
    id: 'school_advantage',
    title: 'School Advantage',
    description: 'Discover university-specific resources, labs, grants, and connections.',
    icon: GraduationCap,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    outputs: ['Resources list', 'Contact templates', 'School-specific roadmap'],
  },
  {
    id: 'funding_pitch',
    title: 'Funding & Pitch',
    description: 'Prepare your pitch, find grants, and draft investor outreach.',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    outputs: ['One-page pitch', 'Grant list', 'Investor email drafts'],
  },
];

export default function Workflows() {
  const navigate = useNavigate();
  const [hoveredWorkflow, setHoveredWorkflow] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-foreground">AI Workflows</h1>
        <p className="text-muted-foreground">
          Structured, AI-powered workflows to accelerate your startup journey
        </p>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Mini-Accelerator Suite</h3>
              <p className="text-sm text-muted-foreground">
                Each workflow guides you through structured inputs and generates actionable artifacts
                using AI. Outputs are saved and can be exported or shared with your team.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workflows.map((workflow, index) => (
          <motion.div
            key={workflow.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * (index + 1) }}
            onMouseEnter={() => setHoveredWorkflow(workflow.id)}
            onMouseLeave={() => setHoveredWorkflow(null)}
          >
            <Card className="h-full hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${workflow.bgColor} flex items-center justify-center shrink-0`}>
                    <workflow.icon className={`w-6 h-6 ${workflow.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {workflow.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {workflow.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">OUTPUTS</p>
                  <div className="flex flex-wrap gap-2">
                    {workflow.outputs.map((output) => (
                      <Badge key={output} variant="secondary" className="text-xs">
                        {output}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant={hoveredWorkflow === workflow.id ? 'default' : 'outline'}
                  onClick={() => navigate(`/portal/workflows/run/${workflow.id}`)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Workflow
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
