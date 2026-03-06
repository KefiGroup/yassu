import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { InactivityWarning } from "@/components/InactivityWarning";
import { usePageTitle } from "@/hooks/usePageTitle";

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
const Search = lazy(() => import("./pages/portal/Search"));
const AcceptConnection = lazy(() => import("./pages/portal/AcceptConnection"));

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

const App = () => {
  if (MAINTENANCE_MODE) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Maintenance />
      </Suspense>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InactivityWarning />
          <BrowserRouter>
            <PageTitleUpdater />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/advisors" element={<Advisors />} />
                <Route path="/ambassadors" element={<AmbassadorsPage />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/accept-connection" element={<AcceptConnection />} />
                
                {/* Portal Routes */}
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
                  <Route path="search" element={<Search />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
