import { useState, useEffect, Suspense } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PortalSidebar } from '@/components/portal/PortalSidebar';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { AnnouncementBanner } from '@/components/portal/AnnouncementBanner';
import { KefiChat } from '@/components/portal/KefiChat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';

function ContentLoader() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function isProfileIncomplete(profile: { bio: string | null; skills: string[]; interests: string[]; universityId: string | null; otherUniversity: string | null } | null): boolean {
  if (!profile) return true;
  const hasBio = !!profile.bio?.trim();
  const hasSkills = profile.skills && profile.skills.length > 0;
  const hasInterests = profile.interests && profile.interests.length > 0;
  const hasUniversity = !!profile.universityId || !!profile.otherUniversity?.trim();
  return !hasBio || !hasSkills || !hasInterests || !hasUniversity;
}

export function PortalLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  useEffect(() => {
    if (!loading && user && profile && !hasCheckedProfile) {
      const isOnProfilePage = location.pathname === '/portal/profile';
      if (isProfileIncomplete(profile) && !isOnProfilePage) {
        setShowIncompleteDialog(true);
      }
      setHasCheckedProfile(true);
    }
  }, [loading, user, profile, hasCheckedProfile, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleGoToProfile = () => {
    setShowIncompleteDialog(false);
    navigate('/portal/profile');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PortalSidebar />
        <div className="flex-1 flex flex-col">
          <PortalHeader />
          <AnnouncementBanner />
          <main className="flex-1 p-6 overflow-auto">
            <Suspense fallback={<ContentLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      <KefiChat />

      <Dialog open={showIncompleteDialog} onOpenChange={setShowIncompleteDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-incomplete-profile">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Complete Your Profile</DialogTitle>
            <DialogDescription className="text-center">
              Your profile is incomplete. A complete profile helps you connect with collaborators, advisors, and ambassadors more effectively.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => setShowIncompleteDialog(false)} data-testid="button-skip-profile">
              Maybe Later
            </Button>
            <Button onClick={handleGoToProfile} data-testid="button-go-to-profile">
              Complete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
