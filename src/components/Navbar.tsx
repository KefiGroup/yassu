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
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">Y</span>
          </div>
          <span className="text-xl font-bold text-foreground">Yassu</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#agents" className="text-muted-foreground hover:text-foreground transition-colors">
            AI Agents
          </a>
          <a href="#universities" className="text-muted-foreground hover:text-foreground transition-colors">
            Universities
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a href="/auth">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              Sign In
            </Button>
          </a>
          <a href="/auth">
            <Button variant="hero" size="sm">
              Get Started
            </Button>
          </a>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
