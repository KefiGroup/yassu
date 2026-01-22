import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Briefcase, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

type InterestType = 'collaborate' | 'invest';

interface ApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaTitle: string;
  interestType: InterestType;
  onSubmit: (application: {
    motivation: string;
    role: string;
    timeCommitment: string;
    experience: string;
    interestType: InterestType;
    investmentRange?: string;
    investorType?: string;
  }) => Promise<void>;
}

const ROLES = [
  'Co-founder',
  'Technical Lead',
  'Product Manager',
  'Designer',
  'Marketing Lead',
  'Business Development',
  'Advisor',
  'Other',
];

const TIME_COMMITMENTS = [
  '5-10 hours/week',
  '10-20 hours/week',
  '20-30 hours/week',
  '30+ hours/week (Full-time)',
];

const INVESTMENT_RANGES = [
  'Under $10,000',
  '$10,000 - $25,000',
  '$25,000 - $50,000',
  '$50,000 - $100,000',
  '$100,000 - $250,000',
  '$250,000+',
  'To be discussed',
];

const INVESTOR_TYPES = [
  'Angel Investor',
  'VC Fund',
  'Family Office',
  'Corporate Investor',
  'Strategic Partner',
  'Other',
];

export function ApplicationForm({ open, onOpenChange, ideaTitle, interestType, onSubmit }: ApplicationFormProps) {
  const [motivation, setMotivation] = useState('');
  const [role, setRole] = useState('');
  const [timeCommitment, setTimeCommitment] = useState('');
  const [experience, setExperience] = useState('');
  const [investmentRange, setInvestmentRange] = useState('');
  const [investorType, setInvestorType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (interestType === 'collaborate') {
      if (!motivation.trim() || !role || !timeCommitment) {
        return;
      }
    } else {
      if (!motivation.trim() || !investorType) {
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        motivation: motivation.trim(),
        role: interestType === 'collaborate' ? role : 'Investor',
        timeCommitment: interestType === 'collaborate' ? timeCommitment : 'Flexible',
        experience: experience.trim(),
        interestType,
        investmentRange: interestType === 'invest' ? investmentRange : undefined,
        investorType: interestType === 'invest' ? investorType : undefined,
      });
      
      // Reset form
      setMotivation('');
      setRole('');
      setTimeCommitment('');
      setExperience('');
      setInvestmentRange('');
      setInvestorType('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit application:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = interestType === 'collaborate' 
    ? (motivation.trim() && role && timeCommitment)
    : (motivation.trim() && investorType);

  const isCollaborate = interestType === 'collaborate';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isCollaborate 
                ? 'bg-gradient-to-br from-purple-600 to-pink-600' 
                : 'bg-gradient-to-br from-green-600 to-emerald-600'
            }`}
          >
            {isCollaborate ? (
              <Briefcase className="w-6 h-6 text-white" />
            ) : (
              <DollarSign className="w-6 h-6 text-white" />
            )}
          </motion.div>
          <DialogTitle className="text-2xl text-center">
            {isCollaborate ? 'Apply to Collaborate' : 'Express Investment Interest'}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {isCollaborate 
              ? <>Express your interest in joining <span className="font-semibold text-foreground">{ideaTitle}</span></>
              : <>Express your interest in investing in <span className="font-semibold text-foreground">{ideaTitle}</span></>
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Motivation */}
          <div className="space-y-2">
            <Label htmlFor="motivation" className="text-base font-semibold">
              {isCollaborate 
                ? 'Why are you interested in this project?' 
                : 'Why are you interested in investing?'
              } <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="motivation"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder={isCollaborate 
                ? "Share what excites you about this idea and why you'd be a great fit..."
                : "Share what interests you about this opportunity and your investment thesis..."
              }
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {isCollaborate 
                ? 'Be specific about what resonates with you and what unique perspective you bring'
                : 'Share your investment focus and what attracted you to this startup'
              }
            </p>
          </div>

          {isCollaborate ? (
            <>
              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-base font-semibold">
                  What role are you interested in? <span className="text-destructive">*</span>
                </Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Commitment */}
              <div className="space-y-2">
                <Label htmlFor="timeCommitment" className="text-base font-semibold">
                  Time commitment <span className="text-destructive">*</span>
                </Label>
                <Select value={timeCommitment} onValueChange={setTimeCommitment}>
                  <SelectTrigger id="timeCommitment">
                    <SelectValue placeholder="Select your availability..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_COMMITMENTS.map((tc) => (
                      <SelectItem key={tc} value={tc}>
                        {tc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Experience */}
              <div className="space-y-2">
                <Label htmlFor="experience" className="text-base font-semibold">
                  Relevant experience <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="experience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="Share relevant projects, skills, or experiences that make you a strong candidate..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </>
          ) : (
            <>
              {/* Investor Type */}
              <div className="space-y-2">
                <Label htmlFor="investorType" className="text-base font-semibold">
                  Investor Type <span className="text-destructive">*</span>
                </Label>
                <Select value={investorType} onValueChange={setInvestorType}>
                  <SelectTrigger id="investorType">
                    <SelectValue placeholder="Select investor type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTOR_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Investment Range */}
              <div className="space-y-2">
                <Label htmlFor="investmentRange" className="text-base font-semibold">
                  Investment Range <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
                </Label>
                <Select value={investmentRange} onValueChange={setInvestmentRange}>
                  <SelectTrigger id="investmentRange">
                    <SelectValue placeholder="Select investment range..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Experience/Background */}
              <div className="space-y-2">
                <Label htmlFor="experience" className="text-base font-semibold">
                  Investment Background <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="experience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="Share your investment experience, portfolio companies, or industry expertise..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className={isCollaborate 
              ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            }
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {isCollaborate ? 'Submit Application' : 'Submit Interest'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
