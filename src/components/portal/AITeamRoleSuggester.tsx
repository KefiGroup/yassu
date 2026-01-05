import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Users,
  Code,
  Palette,
  TrendingUp,
  DollarSign,
  Megaphone,
  Brain,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoleSuggestion {
  role: string;
  priority: 'critical' | 'high' | 'medium';
  reason: string;
  skills: string[];
  icon: any;
  color: string;
}

interface AITeamRoleSuggesterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaData: {
    title: string;
    problem: string;
    solution: string | null;
    targetUser: string | null;
    stage: string;
    desiredTeammates: string | null;
  };
  onRoleSelected?: (role: string) => void;
}

const roleIcons: Record<string, any> = {
  'Technical Co-founder': Code,
  'CTO': Code,
  'Full-Stack Developer': Code,
  'Frontend Developer': Code,
  'Backend Developer': Code,
  'Mobile Developer': Code,
  'Designer': Palette,
  'UI/UX Designer': Palette,
  'Product Designer': Palette,
  'Marketing Lead': Megaphone,
  'Growth Hacker': TrendingUp,
  'Sales Lead': DollarSign,
  'Business Development': DollarSign,
  'Product Manager': Brain,
  'Operations Manager': Users,
  'Data Scientist': Brain,
  'AI/ML Engineer': Brain,
};

const priorityColors = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
};

const priorityLabels = {
  critical: 'Critical',
  high: 'High Priority',
  medium: 'Important',
};

export function AITeamRoleSuggester({ open, onOpenChange, ideaData, onRoleSelected }: AITeamRoleSuggesterProps) {
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      generateSuggestions();
    }
  }, [open, ideaData]);

  const generateSuggestions = () => {
    setLoading(true);
    
    // AI-powered role suggestion logic
    const roles: RoleSuggestion[] = [];
    const stage = ideaData.stage?.toLowerCase() || '';
    const problem = ideaData.problem?.toLowerCase() || '';
    const solution = ideaData.solution?.toLowerCase() || '';
    
    // Determine if it's a tech product
    const isTechProduct = 
      solution.includes('app') || 
      solution.includes('platform') || 
      solution.includes('software') || 
      solution.includes('website') ||
      solution.includes('ai') ||
      solution.includes('mobile');
    
    // Determine if it's B2B or B2C
    const isB2B = 
      ideaData.targetUser?.toLowerCase().includes('business') ||
      ideaData.targetUser?.toLowerCase().includes('company') ||
      ideaData.targetUser?.toLowerCase().includes('enterprise');
    
    // Critical roles based on stage and type
    if (isTechProduct) {
      roles.push({
        role: 'Technical Co-founder',
        priority: 'critical',
        reason: 'You need someone to build your product. A technical co-founder can turn your vision into reality and make critical technology decisions.',
        skills: ['Full-stack development', 'System architecture', 'Product development', 'Technical leadership'],
        icon: Code,
        color: 'from-blue-500 to-cyan-500',
      });
    }
    
    // Always need a designer for early-stage products
    if (stage.includes('idea') || stage.includes('build') || stage.includes('mvp')) {
      roles.push({
        role: 'UI/UX Designer',
        priority: isTechProduct ? 'high' : 'critical',
        reason: 'Great design is what makes users fall in love with your product. A designer ensures your solution is intuitive and delightful.',
        skills: ['User research', 'Wireframing', 'Prototyping', 'Visual design', 'Figma'],
        icon: Palette,
        color: 'from-purple-500 to-pink-500',
      });
    }
    
    // Marketing/Growth for post-MVP
    if (stage.includes('launch') || stage.includes('mvp') || stage.includes('yassu')) {
      roles.push({
        role: 'Growth Hacker',
        priority: 'high',
        reason: 'Building is only half the battle. You need someone who can acquire users, run experiments, and drive growth.',
        skills: ['Digital marketing', 'SEO/SEM', 'Analytics', 'Growth experiments', 'Content strategy'],
        icon: TrendingUp,
        color: 'from-green-500 to-emerald-500',
      });
    }
    
    // Sales for B2B
    if (isB2B) {
      roles.push({
        role: 'Business Development',
        priority: 'high',
        reason: 'B2B sales require relationship building and enterprise expertise. A BD person can open doors and close deals.',
        skills: ['Enterprise sales', 'Relationship building', 'Negotiation', 'Pipeline management'],
        icon: DollarSign,
        color: 'from-yellow-500 to-orange-500',
      });
    }
    
    // Product Manager for complex products
    if (isTechProduct && (stage.includes('build') || stage.includes('mvp'))) {
      roles.push({
        role: 'Product Manager',
        priority: 'medium',
        reason: 'As your product grows, you need someone to prioritize features, talk to users, and keep the team aligned.',
        skills: ['Product strategy', 'User research', 'Roadmap planning', 'Stakeholder management'],
        icon: Brain,
        color: 'from-indigo-500 to-purple-500',
      });
    }
    
    // AI/ML for AI products
    if (solution.includes('ai') || solution.includes('machine learning') || solution.includes('ml')) {
      roles.push({
        role: 'AI/ML Engineer',
        priority: 'critical',
        reason: 'AI products need specialized expertise. An ML engineer can build, train, and deploy models that power your solution.',
        skills: ['Machine learning', 'Python', 'TensorFlow/PyTorch', 'Data engineering', 'Model deployment'],
        icon: Brain,
        color: 'from-violet-500 to-purple-500',
      });
    }
    
    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    roles.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    // Take top 4
    setSuggestions(roles.slice(0, 4));
    setLoading(false);
  };

  const handleRoleClick = (role: string) => {
    setSelectedRole(role);
  };

  const handleFindRole = () => {
    if (selectedRole) {
      onRoleSelected?.(selectedRole);
      toast({
        title: 'Searching for candidates',
        description: `Looking for ${selectedRole} candidates in the marketplace...`,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl">AI Team Builder</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Based on your idea, here are the roles you should prioritize
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <AnimatePresence>
              {suggestions.map((suggestion, index) => {
                const Icon = suggestion.icon;
                const isSelected = selectedRole === suggestion.role;
                
                return (
                  <motion.div
                    key={suggestion.role}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        isSelected ? 'ring-2 ring-purple-500 shadow-lg' : ''
                      }`}
                      onClick={() => handleRoleClick(suggestion.role)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${suggestion.color} flex-shrink-0`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  {suggestion.role}
                                  {isSelected && (
                                    <CheckCircle2 className="h-5 w-5 text-purple-600" />
                                  )}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className={`mt-1 ${priorityColors[suggestion.priority]}`}
                                >
                                  {priorityLabels[suggestion.priority]}
                                </Badge>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {suggestion.reason}
                            </p>
                            
                            <div className="flex flex-wrap gap-2">
                              {suggestion.skills.map((skill) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {suggestions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No role suggestions available at this time.</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleFindRole}
            disabled={!selectedRole || loading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {selectedRole ? (
              <>
                Find {selectedRole}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              'Select a role first'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
