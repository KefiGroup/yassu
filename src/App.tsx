import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import Advisors from "./pages/Advisors";
import AmbassadorsPage from "./pages/AmbassadorsPage";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import { PortalLayout } from "./layouts/PortalLayout";
import Dashboard from "./pages/portal/Dashboard";
import Ideas from "./pages/portal/Ideas";
import CreateIdea from "./pages/portal/CreateIdea";
import IdeaWizard from "./pages/portal/IdeaWizard";
import IdeaDetail from "./pages/portal/IdeaDetail";
import Teams from "./pages/portal/Teams";
import Workflows from "./pages/portal/Workflows";
import WorkflowRun from "./pages/portal/WorkflowRun";
import Projects from "./pages/portal/Projects";
import Resources from "./pages/portal/Resources";
import Messages from "./pages/portal/Messages";
import Profile from "./pages/portal/Profile";
import Settings from "./pages/portal/Settings";
import PortalAmbassadors from "./pages/portal/Ambassadors";
import PortalAdvisors from "./pages/portal/Advisors";
import Collaborators from "./pages/portal/Collaborators";
import UserProfile from "./pages/portal/UserProfile";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/advisors" element={<Advisors />} />
            <Route path="/ambassadors" element={<AmbassadorsPage />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            
            {/* Portal Routes */}
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="ideas" element={<Ideas />} />
              <Route path="ideas/new" element={<CreateIdea />} />
              <Route path="ideas/wizard" element={<IdeaWizard />} />
              <Route path="ideas/:ideaId" element={<IdeaDetail />} />
              <Route path="teams" element={<Teams />} />
              <Route path="workflows" element={<Workflows />} />
              <Route path="workflows/run/:workflowType" element={<WorkflowRun />} />
              <Route path="projects" element={<Projects />} />
              <Route path="resources" element={<Resources />} />
              <Route path="messages" element={<Messages />} />
              <Route path="ambassadors" element={<PortalAmbassadors />} />
              <Route path="advisors" element={<PortalAdvisors />} />
              <Route path="collaborators" element={<Collaborators />} />
              <Route path="users/:userId" element={<UserProfile />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Admin Route */}
            <Route path="/admin" element={<Admin />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
