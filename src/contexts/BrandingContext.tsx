import { createContext, useContext, useEffect, useMemo } from 'react';
import { BrandConfig, getBrandByPath } from '@/lib/branding';

const BrandingContext = createContext<BrandConfig | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const brand = useMemo(() => getBrandByPath(window.location.pathname), []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', brand.colors.primary);
    root.style.setProperty('--accent', brand.colors.accent);
    root.style.setProperty('--ring', brand.colors.ring);
    root.style.setProperty('--glow-primary', brand.colors.glowPrimary);
    root.style.setProperty('--glow-accent', brand.colors.glowAccent);
    root.style.setProperty('--gradient-start', brand.colors.gradientStart);
    root.style.setProperty('--gradient-end', brand.colors.gradientEnd);
    root.style.setProperty('--sidebar-primary', brand.colors.sidebarPrimary);
    root.style.setProperty('--sidebar-ring', brand.colors.sidebarRing);

    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--glow-primary');
      root.style.removeProperty('--glow-accent');
      root.style.removeProperty('--gradient-start');
      root.style.removeProperty('--gradient-end');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-ring');
    };
  }, [brand.id]);

  return (
    <BrandingContext.Provider value={brand}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandConfig {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
