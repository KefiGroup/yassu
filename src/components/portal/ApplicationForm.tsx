import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

interface ApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaTitle: string;
  onSubmit: (application: {
    motivation: string;
    role: string;
    timeCommitment: string;
    experience: string;
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

export function ApplicationForm({ open, onOpenChange, ideaTitle, onSubmit }: ApplicationFormProps) {
  const [motivation, setMotivation] = useState('');
  const [role, setRole] = useState('');
  const [timeCommitment, setTimeCommitment] = useState('');
  const [experience, setExperience] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!motivation.trim() || !role || !timeCommitment) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        motivation: motivation.trim(),
        role,
        timeCommitment,
        experience: experience.trim(),
      });
      
      // Reset form
      setMotivation('');
      setRole('');
      setTimeCommitment('');
      setExperience('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit application:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = motivation.trim() && role && timeCommitment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Briefcase className="w-6 h-6 text-white" />
          </motion.div>
          <DialogTitle className="text-2xl text-center">Apply to Join</DialogTitle>
          <DialogDescription className="text-center text-base">
            Express your interest in <span className="font-semibold text-foreground">{ideaTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Motivation */}
          <div className="space-y-2">
            <Label htmlFor="motivation" className="text-base font-semibold">
              Why are you interested in this project? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="motivation"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Share what excites you about this idea and why you'd be a great fit..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Be specific about what resonates with you and what unique perspective you bring
            </p>
          </div>

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
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
