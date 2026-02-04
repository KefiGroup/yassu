import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

const Navbar = () => {
  const { user, signOut } = useAuth();
  
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      <div className="container mx-auto px-6 py-2 flex items-center justify-between">
        <a href="/" className="flex items-center" data-testid="link-nav-home">
          <img src="/yassu-logo.png" alt="Yassu" className="h-24 w-auto" />
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-how-it-works">
            How Yassu Works
          </a>
          <a href="/#ideas" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-ideas">
            Yassu Ideas
          </a>
          <a href="/#team" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-team">
            Yassu Team
          </a>
          <a href="/ambassadors" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-ambassadors">
            Ambassadors
          </a>
          <a href="/advisors" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-advisors">
            Advisors
          </a>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <a href="/portal" data-testid="link-nav-dashboard">
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
                Logout
              </Button>
            </>
          ) : (
            <>
              <a href="/auth" data-testid="link-nav-sign-in">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" data-testid="button-nav-sign-in">
                  Sign In
                </Button>
              </a>
              <a href="/auth" data-testid="link-nav-get-started">
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
