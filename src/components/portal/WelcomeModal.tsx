/**
 * Welcome Modal Component
 * Shows when a new user first logs in, introducing them to Yassu
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, FileText, TrendingUp, CheckCircle2 } from "lucide-react";
import { useOnboarding } from "@/hooks/use-onboarding";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const { startTour, shouldShowTour, markTourCompleted } = useOnboarding();

  useEffect(() => {
    // Show welcome modal if user hasn't seen it
    const hasSeenWelcome = localStorage.getItem("yassu_has_seen_welcome");
    if (!hasSeenWelcome) {
      // Delay to ensure page is fully loaded
      setTimeout(() => setOpen(true), 500);
    }
  }, []);

  const handleStartTour = () => {
    localStorage.setItem("yassu_has_seen_welcome", "true");
    setOpen(false);
    // Start dashboard tour after a brief delay
    setTimeout(() => {
      if (shouldShowTour("dashboard")) {
        startTour("dashboard");
      }
    }, 300);
  };

  const handleSkip = () => {
    localStorage.setItem("yassu_has_seen_welcome", "true");
    markTourCompleted("dashboard");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Welcome to Yassu! 🎉</DialogTitle>
              <DialogDescription className="text-base">
                Where elite university talent builds together
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-muted-foreground">
            Yassu helps you turn your startup ideas into reality by connecting you with
            collaborators, advisors, and AI-powered business planning tools.
          </p>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">What you can do on Yassu:</h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-medium">Post Your Ideas</h4>
                  <p className="text-sm text-muted-foreground">
                    Share your startup concepts and get feedback from the community
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium">Generate Business Plans</h4>
                  <p className="text-sm text-muted-foreground">
                    Use AI to create comprehensive business plans in minutes
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium">Find Collaborators</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect with talented students who share your passion
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium">Get Expert Guidance</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect with advisors, ambassadors, and successful entrepreneurs
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border border-dashed">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Quick Tip</p>
                <p className="text-sm text-muted-foreground">
                  Complete your profile first to get better matches with collaborators and advisors!
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip} className="w-full sm:w-auto">
            Skip Tour
          </Button>
          <Button onClick={handleStartTour} className="w-full sm:w-auto">
            <Sparkles className="w-4 h-4 mr-2" />
            Start Tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
