import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Yassu - Where Ideas Meet Builders',
  '/auth': 'Sign In | Yassu',
  '/forgot-password': 'Forgot Password | Yassu',
  '/reset-password': 'Reset Password | Yassu',
  '/advisors': 'Become an Advisor | Yassu',
  '/ambassadors': 'Become an Ambassador | Yassu',
  '/terms': 'Terms of Service | Yassu',
  '/privacy': 'Privacy Policy | Yassu',
  '/accept-connection': 'Accept Connection | Yassu',
  '/portal': 'Dashboard | Yassu',
  '/portal/ideas': 'Ideas Marketplace | Yassu',
  '/portal/ideas/new': 'Post an Idea | Yassu',
  '/portal/ideas/wizard': 'Idea Wizard | Yassu',
  '/portal/my-ideas': 'My Ideas | Yassu',
  '/portal/projects': 'Projects | Yassu',
  '/portal/teams': 'Teams | Yassu',
  '/portal/workflows': 'Workflows | Yassu',
  '/portal/resources': 'Startup Resources | Yassu',
  '/portal/messages': 'Messages | Yassu',
  '/portal/profile': 'My Profile | Yassu',
  '/portal/settings': 'Settings | Yassu',
  '/portal/ambassadors': 'Ambassador Network | Yassu',
  '/portal/advisors': 'Advisor Network | Yassu',
  '/portal/collaborators': 'Collaborators | Yassu',
  '/portal/referral-dashboard': 'Referral Dashboard | Yassu',
  '/portal/pipeline': 'Pipeline | Yassu',
  '/portal/mvp-builder': 'MVP Builder | Yassu',
  '/portal/pitch-deck': 'Pitch Deck | Yassu',
  '/portal/investor-pitch-deck': 'Investor Pitch Deck | Yassu',
  '/portal/pitch-preparation': 'Pitch Preparation | Yassu',
  '/portal/foundry': 'Yassu Foundry | Yassu',
  '/portal/admin': 'Admin Dashboard | Yassu',
  '/portal/search': 'Search | Yassu',
};

const DYNAMIC_PATTERNS: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /^\/portal\/ideas\/[^/]+\/edit$/, title: 'Edit Idea | Yassu' },
  { pattern: /^\/portal\/ideas\/[^/]+\/smart-match$/, title: 'Smart Matching | Yassu' },
  { pattern: /^\/portal\/ideas\/[^/]+$/, title: 'Idea Details | Yassu' },
  { pattern: /^\/portal\/teams\/[^/]+$/, title: 'Team Details | Yassu' },
  { pattern: /^\/portal\/workflows\/[^/]+$/, title: 'Workflow Details | Yassu' },
  { pattern: /^\/portal\/users\/[^/]+$/, title: 'User Profile | Yassu' },
];

function getTitle(pathname: string): string {
  const staticTitle = PAGE_TITLES[pathname];
  if (staticTitle) return staticTitle;

  for (const { pattern, title } of DYNAMIC_PATTERNS) {
    if (pattern.test(pathname)) return title;
  }

  return 'Page Not Found | Yassu';
}

export function usePageTitle() {
  const location = useLocation();

  useEffect(() => {
    const title = getTitle(location.pathname);
    document.title = title;
  }, [location.pathname]);
}
