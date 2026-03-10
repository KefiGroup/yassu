import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Navbar = () => {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      <div className="container mx-auto px-6 py-2 flex items-center justify-between">
        <a href="/" className="flex items-center" data-testid="link-nav-home">
          <img src="/bruin-logo.png" alt="Bruin Entrepreneurs" className="h-16 w-auto" />
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-how-it-works">
            How It Works
          </a>
          <a href="/#ideas" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-ideas">
            Member Ideas
          </a>
          <a href="/#team" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-team">
            Our Team
          </a>
          <a href="/ambassadors" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-ambassadors">
            Ambassadors
          </a>
          <a href="/advisors" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-advisors">
            Advisors
          </a>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
