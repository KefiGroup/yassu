/**
 * Onboarding Tour Hook
 * Manages the interactive onboarding experience for new users
 */

import { useEffect, useState } from "react";
import { driver, DriveStep, Config } from "driver.js";
import "driver.js/dist/driver.css";

export interface OnboardingStep extends DriveStep {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
  };
}

export interface OnboardingTour {
  id: string;
  name: string;
  steps: OnboardingStep[];
}

// Define onboarding tours for different parts of the application
export const ONBOARDING_TOURS: Record<string, OnboardingTour> = {
  dashboard: {
    id: "dashboard",
    name: "Dashboard Tour",
    steps: [
      {
        element: "[data-tour='welcome']",
        popover: {
          title: "👋 Welcome to Yassu!",
          description: "Let's take a quick tour to help you get started. You can skip this tour at any time.",
          side: "bottom",
        },
      },
      {
        element: "[data-tour='profile']",
        popover: {
          title: "👤 Complete Your Profile First",
          description: "Start by completing your profile! Add your skills, interests, and experience to get matched with the right collaborators and advisors.",
          side: "left",
        },
      },
      {
        element: "[data-tour='new-idea-button']",
        popover: {
          title: "🚀 Post Your First Idea",
          description: "Now you're ready to share your startup idea! This is where your entrepreneurial journey begins.",
          side: "bottom",
        },
      },
      {
        element: "[data-tour='my-ideas']",
        popover: {
          title: "💡 Your Ideas",
          description: "All your posted ideas will appear here. You can track their progress, generate business plans, and find collaborators.",
          side: "right",
        },
      },
      {
        element: "[data-tour='marketplace']",
        popover: {
          title: "🌟 Marketplace",
          description: "Explore ideas from other students, find collaborators, connect with ambassadors and advisors.",
          side: "right",
        },
      },
    ],
  },
  ideaDetail: {
    id: "ideaDetail",
    name: "Idea Detail Tour",
    steps: [
      {
        element: "[data-tour='generate-plan']",
        popover: {
          title: "🤖 AI Business Plan Generator",
          description: "Click here to generate a comprehensive business plan using AI. It analyzes your idea and creates 8 detailed sections in about 2 minutes.",
          side: "top",
        },
      },
      {
        element: "[data-tour='team-section']",
        popover: {
          title: "👥 Build Your Team",
          description: "Find potential collaborators and team members who match your needs. You can send join requests and start collaborating.",
          side: "top",
        },
      },
      {
        element: "[data-tour='share-idea']",
        popover: {
          title: "📤 Share Your Idea",
          description: "Share your idea with advisors, investors, or on social media to get feedback and attract talent.",
          side: "left",
        },
      },
    ],
  },
  marketplace: {
    id: "marketplace",
    name: "Marketplace Tour",
    steps: [
      {
        element: "[data-tour='search-bar']",
        popover: {
          title: "🔍 Search & Filter",
          description: "Use the search bar and filters to find ideas, collaborators, or advisors that match your interests.",
          side: "bottom",
        },
      },
      {
        element: "[data-tour='idea-cards']",
        popover: {
          title: "💡 Browse Ideas",
          description: "Click on any idea card to view details, see the business plan, and request to join the team.",
          side: "top",
        },
      },
      {
        element: "[data-tour='filters']",
        popover: {
          title: "🎯 Filter by Category",
          description: "Filter ideas by industry, university, team size, or skills needed to find the perfect match.",
          side: "left",
        },
      },
    ],
  },
};

export function useOnboarding() {
  const [hasCompletedTour, setHasCompletedTour] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load completed tours from localStorage
    const completed = localStorage.getItem("yassu_completed_tours");
    if (completed) {
      try {
        setHasCompletedTour(JSON.parse(completed));
      } catch (error) {
        console.error("Failed to parse completed tours:", error);
      }
    }
  }, []);

  const markTourCompleted = (tourId: string) => {
    const updated = { ...hasCompletedTour, [tourId]: true };
    setHasCompletedTour(updated);
    localStorage.setItem("yassu_completed_tours", JSON.stringify(updated));
  };

  const resetTour = (tourId: string) => {
    const updated = { ...hasCompletedTour, [tourId]: false };
    setHasCompletedTour(updated);
    localStorage.setItem("yassu_completed_tours", JSON.stringify(updated));
  };

  const resetAllTours = () => {
    setHasCompletedTour({});
    localStorage.removeItem("yassu_completed_tours");
  };

  const startTour = (tourId: string, options?: Partial<Config>) => {
    const tour = ONBOARDING_TOURS[tourId];
    if (!tour) {
      console.error(`Tour "${tourId}" not found`);
      return;
    }

    const driverObj = driver({
      showProgress: true,
      steps: tour.steps,
      onDestroyStarted: () => {
        if (driverObj.hasNextStep() || confirm("Are you sure you want to exit the tour?")) {
          driverObj.destroy();
          markTourCompleted(tourId);
        }
      },
      onDestroyed: () => {
        markTourCompleted(tourId);
      },
      ...options,
    });

    driverObj.drive();
  };

  const shouldShowTour = (tourId: string): boolean => {
    return !hasCompletedTour[tourId];
  };

  return {
    startTour,
    shouldShowTour,
    markTourCompleted,
    resetTour,
    resetAllTours,
    hasCompletedTour,
  };
}

/**
 * Auto-start tour when component mounts (if not completed)
 */
export function useAutoStartTour(tourId: string, delay: number = 1000) {
  const { startTour, shouldShowTour } = useOnboarding();

  useEffect(() => {
    if (shouldShowTour(tourId)) {
      const timer = setTimeout(() => {
        startTour(tourId);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [tourId, delay, startTour, shouldShowTour]);
}
