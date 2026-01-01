import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { PortalLayout } from "./layouts/PortalLayout";
import Dashboard from "./pages/portal/Dashboard";
import Ideas from "./pages/portal/Ideas";
import Teams from "./pages/portal/Teams";
import Workflows from "./pages/portal/Workflows";
import Projects from "./pages/portal/Projects";
import Resources from "./pages/portal/Resources";
import Messages from "./pages/portal/Messages";
import Profile from "./pages/portal/Profile";

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
            
            {/* Portal Routes */}
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="ideas" element={<Ideas />} />
              <Route path="teams" element={<Teams />} />
              <Route path="workflows" element={<Workflows />} />
              <Route path="projects" element={<Projects />} />
              <Route path="resources" element={<Resources />} />
              <Route path="messages" element={<Messages />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
