import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">Y</span>
            </div>
            <span className="text-xl font-bold text-foreground">Yassu</span>
          </div>

          <p className="text-muted-foreground text-sm text-center">
            The LinkedIn × Notion × OpenAI for university founders
          </p>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">Privacy</a>
            <a href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">Terms</a>
            <a href="mailto:hello@yassu.co" className="hover:text-foreground transition-colors" data-testid="link-contact">Contact</a>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-muted-foreground/60 text-sm mt-8"
        >
          © {new Date().getFullYear()} Yassu. All rights reserved.
        </motion.p>
      </div>
    </footer>
  );
};

export default Footer;
