import { motion } from "framer-motion";
import { useBranding } from "@/contexts/BrandingContext";

const Footer = () => {
  const brand = useBranding();
  const base = brand.basePath;

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
          <div className="flex items-center">
            <img src={brand.logoPath} alt={brand.name} className="h-20 w-auto" />
          </div>

          <p className="text-muted-foreground text-sm text-center">
            {brand.footerSlogan}
          </p>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href={`${base}/privacy`} className="hover:text-foreground transition-colors" data-testid="link-privacy">Privacy</a>
            <a href={`${base}/terms`} className="hover:text-foreground transition-colors" data-testid="link-terms">Terms</a>
            <a href={`mailto:${brand.contactEmail}`} className="hover:text-foreground transition-colors" data-testid="link-contact">Contact</a>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-muted-foreground/60 text-sm mt-8"
        >
          © {new Date().getFullYear()} {brand.copyrightName}. All rights reserved.
          {brand.id !== 'yassu' && (
            <span className="block mt-1">Powered by <a href="https://yassu.ai" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors underline">Yassu</a></span>
          )}
        </motion.p>
      </div>
    </footer>
  );
};

export default Footer;
