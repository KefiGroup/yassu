import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getBrandByPath } from '@/lib/branding';

const PAGE_TITLES: Record<string, string> = {
  '/': '{brand} - Where Ideas Meet Builders',
  '/auth': 'Sign In | {brand}',
  '/forgot-password': 'Forgot Password | {brand}',
  '/reset-password': 'Reset Password | {brand}',
  '/advisors': 'Become an Advisor | {brand}',
  '/ambassadors': 'Become an Ambassador | {brand}',
  '/terms': 'Terms of Service | {brand}',
  '/privacy': 'Privacy Policy | {brand}',
  '/accept-connection': 'Accept Connection | {brand}',
  '/portal': 'Dashboard | {brand}',
  '/portal/ideas': 'Ideas Marketplace | {brand}',
  '/portal/ideas/new': 'Post an Idea | {brand}',
  '/portal/ideas/wizard': 'Idea Wizard | {brand}',
  '/portal/my-ideas': 'My Ideas | {brand}',
  '/portal/projects': 'Projects | {brand}',
  '/portal/teams': 'Teams | {brand}',
  '/portal/workflows': 'Workflows | {brand}',
  '/portal/resources': 'Startup Resources | {brand}',
  '/portal/messages': 'Messages | {brand}',
  '/portal/profile': 'My Profile | {brand}',
  '/portal/settings': 'Settings | {brand}',
  '/portal/ambassadors': 'Ambassador Network | {brand}',
  '/portal/advisors': 'Advisor Network | {brand}',
  '/portal/collaborators': 'Collaborators | {brand}',
  '/portal/referral-dashboard': 'Referral Dashboard | {brand}',
  '/portal/pipeline': 'Pipeline | {brand}',
  '/portal/mvp-builder': 'MVP Builder | {brand}',
  '/portal/pitch-deck': 'Pitch Deck | {brand}',
  '/portal/investor-pitch-deck': 'Investor Pitch Deck | {brand}',
  '/portal/pitch-preparation': 'Pitch Preparation | {brand}',
  '/portal/foundry': 'Foundry | {brand}',
  '/portal/admin': 'Admin Dashboard | {brand}',
  '/portal/search': 'Search | {brand}',
};

const DYNAMIC_PATTERNS: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /^\/portal\/ideas\/[^/]+\/edit$/, title: 'Edit Idea | {brand}' },
  { pattern: /^\/portal\/ideas\/[^/]+\/smart-match$/, title: 'Smart Matching | {brand}' },
  { pattern: /^\/portal\/ideas\/[^/]+$/, title: 'Idea Details | {brand}' },
  { pattern: /^\/portal\/teams\/[^/]+$/, title: 'Team Details | {brand}' },
  { pattern: /^\/portal\/workflows\/[^/]+$/, title: 'Workflow Details | {brand}' },
  { pattern: /^\/portal\/users\/[^/]+$/, title: 'User Profile | {brand}' },
];

function getTitle(pathname: string, brandName: string): string {
  const staticTitle = PAGE_TITLES[pathname];
  if (staticTitle) return staticTitle.replace(/\{brand\}/g, brandName);

  for (const { pattern, title } of DYNAMIC_PATTERNS) {
    if (pattern.test(pathname)) return title.replace(/\{brand\}/g, brandName);
  }

  return `Page Not Found | ${brandName}`;
}

export function usePageTitle() {
  const location = useLocation();
  const brand = getBrandByPath(window.location.pathname);

  useEffect(() => {
    const title = getTitle(location.pathname, brand.name);
    document.title = title;
  }, [location.pathname, brand.name]);
}
