import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { LogOut } from "lucide-react";

const Navbar = () => {
  const { user, signOut, loading } = useAuth();
  const brand = useBranding();
  const base = brand.basePath;
  
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      <div className="container mx-auto px-6 py-2 flex items-center justify-between">
        <a href={`${base}/`} className="flex items-center" data-testid="link-nav-home">
          <img src={brand.logoPath} alt={brand.name} className="h-24 w-auto" />
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href={`${base}/#how-it-works`} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-how-it-works">
            {brand.navLabels.howItWorks}
          </a>
          <a href={`${base}/#ideas`} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-ideas">
            {brand.navLabels.ideas}
          </a>
          {brand.id === 'yassu' && (
            <a href={`${base}/#team`} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-team">
              {brand.navLabels.team}
            </a>
          )}
          <a href={`${base}/ambassadors`} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-ambassadors">
            {brand.navLabels.ambassadors}
          </a>
          <a href={`${base}/advisors`} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-advisors">
            {brand.navLabels.advisors}
          </a>
          {brand.id !== 'yassu' && (
            <a href="/#team" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-team">
              {brand.navLabels.team}
            </a>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-24 bg-muted/50 rounded animate-pulse" />
          ) : user ? (
            <>
              <a href={`${base}/portal`} data-testid="link-nav-dashboard">
                <Button variant="hero" size="sm" data-testid="button-nav-dashboard">
                  My Dashboard
                </Button>
              </a>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => signOut('manual')}
                data-testid="button-nav-logout"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <a href={`${base}/auth`} data-testid="link-nav-sign-in">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" data-testid="button-nav-sign-in">
                  Sign In
                </Button>
              </a>
              <a href={`${base}/auth`} data-testid="link-nav-get-started">
                <Button variant="hero" size="sm" data-testid="button-nav-get-started">
                  Get Started
                </Button>
              </a>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
