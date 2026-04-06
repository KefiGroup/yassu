import React, { Suspense, lazy, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { Skeleton } from "@/components/ui/skeleton";
import { InactivityWarning } from "@/components/InactivityWarning";
import { usePageTitle } from "@/hooks/usePageTitle";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center space-y-4 p-8 max-w-md">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">An unexpected error occurred. Please refresh the page to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              data-testid="button-error-reload"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageTitleUpdater() {
  usePageTitle();
  return null;
}

const Maintenance = lazy(() => import("./pages/Maintenance"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Advisors = lazy(() => import("./pages/Advisors"));
const AmbassadorsPage = lazy(() => import("./pages/AmbassadorsPage"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const PortalLayout = lazy(() => import("./layouts/PortalLayout").then(m => ({ default: m.PortalLayout })));
const Dashboard = lazy(() => import("./pages/portal/Dashboard"));
const Ideas = lazy(() => import("./pages/portal/Ideas"));
const CreateIdea = lazy(() => import("./pages/portal/CreateIdea"));
const IdeaWizard = lazy(() => import("./pages/portal/IdeaWizard"));
const IdeaDetail = lazy(() => import("./pages/portal/IdeaDetail"));
const MyIdeas = lazy(() => import("./pages/portal/MyIdeas"));
const SmartMatching = lazy(() => import("./pages/portal/SmartMatching"));
const Teams = lazy(() => import("./pages/portal/Teams"));
const TeamDetail = lazy(() => import("./pages/portal/TeamDetail"));
const Workflows = lazy(() => import("./pages/portal/Workflows"));
const WorkflowRun = lazy(() => import("./pages/portal/WorkflowRun"));
const Projects = lazy(() => import("./pages/portal/Projects"));
const Resources = lazy(() => import("./pages/portal/Resources"));
const Messages = lazy(() => import("./pages/portal/Messages"));
const Profile = lazy(() => import("./pages/portal/Profile"));
const Settings = lazy(() => import("./pages/portal/Settings"));
const PortalAmbassadors = lazy(() => import("./pages/portal/Ambassadors"));
const PortalAdvisors = lazy(() => import("./pages/portal/Advisors"));
const Collaborators = lazy(() => import("./pages/portal/Collaborators"));
const UserProfile = lazy(() => import("./pages/portal/UserProfile"));
const ReferralDashboard = lazy(() => import("./pages/portal/ReferralDashboard"));
const Pipeline = lazy(() => import("./pages/portal/Pipeline"));
const MVPBuilder = lazy(() => import("./pages/portal/MVPBuilder"));
const PitchDeck = lazy(() => import("./pages/portal/PitchDeck"));
const InvestorPitchDeck = lazy(() => import("./pages/portal/InvestorPitchDeck"));
const PitchPreparation = lazy(() => import("./pages/portal/PitchPreparation"));
const Foundry = lazy(() => import("./pages/portal/Foundry"));
const Admin = lazy(() => import("./pages/Admin"));
const GroupAdmin = lazy(() => import("./pages/portal/GroupAdmin"));
const Search = lazy(() => import("./pages/portal/Search"));
const AcceptConnection = lazy(() => import("./pages/portal/AcceptConnection"));
const AcceptGroupInvite = lazy(() => import("./pages/portal/AcceptGroupInvite"));
const GroupApply = lazy(() => import("./pages/GroupApply"));
const ApplicationEditor = lazy(() => import("./pages/portal/ApplicationEditor"));

const queryClient = new QueryClient();

const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="space-y-4 w-full max-w-md p-8">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <PageTitleUpdater />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/bruin" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/advisors" element={<Advisors />} />
          <Route path="/ambassadors" element={<AmbassadorsPage />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/accept-connection" element={<AcceptConnection />} />
          <Route path="/accept-group-invite" element={<AcceptGroupInvite />} />
          <Route path="/apply/:slug" element={<GroupApply />} />
          <Route path="/bruin/apply/:slug" element={<GroupApply />} />
          
          <Route path="/portal" element={<PortalLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="ideas" element={<Ideas />} />
            <Route path="ideas/new" element={<CreateIdea />} />
            <Route path="ideas/wizard" element={<IdeaWizard />} />
            <Route path="ideas/:id" element={<IdeaDetail />} />
            <Route path="ideas/:id/edit" element={<CreateIdea />} />
            <Route path="ideas/:id/smart-match" element={<SmartMatching />} />
            <Route path="my-ideas" element={<MyIdeas />} />
            <Route path="projects" element={<Projects />} />
            <Route path="teams" element={<Teams />} />
            <Route path="teams/:id" element={<TeamDetail />} />
            <Route path="workflows" element={<Workflows />} />
            <Route path="workflows/:id" element={<WorkflowRun />} />
            <Route path="resources" element={<Resources />} />
            <Route path="messages" element={<Messages />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="ambassadors" element={<PortalAmbassadors />} />
            <Route path="advisors" element={<PortalAdvisors />} />
            <Route path="collaborators" element={<Collaborators />} />
            <Route path="users/:userId" element={<UserProfile />} />
            <Route path="referral-dashboard" element={<ReferralDashboard />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="mvp-builder" element={<MVPBuilder />} />
            <Route path="pitch-deck" element={<PitchDeck />} />
            <Route path="investor-pitch-deck" element={<InvestorPitchDeck />} />
            <Route path="pitch-preparation" element={<PitchPreparation />} />
            <Route path="foundry" element={<Foundry />} />
            <Route path="admin" element={<Admin />} />
            <Route path="applications/:slug" element={<ApplicationEditor />} />
            <Route path="group-admin" element={<GroupAdmin />} />
            <Route path="search" element={<Search />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const basename = '';

const App = () => {
  if (MAINTENANCE_MODE) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Maintenance />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <InactivityWarning />
            <BrowserRouter basename={basename}>
              <BrandingProvider>
                <AppRoutes />
              </BrandingProvider>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
