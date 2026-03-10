export interface BrandConfig {
  id: string;
  name: string;
  tagline: string;
  subtitle: string;
  description: string;
  logoPath: string;
  contactEmail: string;
  copyrightName: string;
  footerSlogan: string;
  aiAssistantName: string;
  basePath: string;
  canonicalUrl: string;
  colors: {
    primary: string;
    accent: string;
    ring: string;
    glowPrimary: string;
    glowAccent: string;
    gradientStart: string;
    gradientEnd: string;
    sidebarPrimary: string;
    sidebarRing: string;
  };
  universities: string[];
  howItWorksSteps: {
    postIdea: string;
    generatePlan: string;
    findAdvisors: string;
    formTeam: string;
    presentFoundry: string;
  };
  navLabels: {
    howItWorks: string;
    ideas: string;
    team: string;
    ambassadors: string;
    advisors: string;
  };
  visionQuote: string;
  joinButtonText: string;
}

export const YASSU_BRAND: BrandConfig = {
  id: 'yassu',
  name: 'Yassu',
  tagline: 'The New-Age Marketplace for University-Native Company Creation',
  subtitle: 'Where Ideas Meet Builders',
  description: 'Yassu is the national marketplace where university-native talent uses AI, shared structure, and cross-campus collaboration to build real companies, before capital decides who matters.',
  logoPath: '/yassu-logo.png',
  contactEmail: 'hello@yassu.ai',
  copyrightName: 'Yassu',
  footerSlogan: 'The LinkedIn × Notion × OpenAI for university founders',
  aiAssistantName: 'Kefi',
  basePath: '',
  canonicalUrl: 'https://yassu.ai',
  colors: {
    primary: '250 60% 65%',
    accent: '15 80% 75%',
    ring: '250 60% 65%',
    glowPrimary: '250 60% 75%',
    glowAccent: '15 80% 80%',
    gradientStart: '250 60% 70%',
    gradientEnd: '320 60% 75%',
    sidebarPrimary: '250 60% 65%',
    sidebarRing: '250 60% 65%',
  },
  universities: ['UCLA', 'MIT', 'Stanford', 'Harvard', 'Caltech', 'Northwestern'],
  howItWorksSteps: {
    postIdea: 'Post an Idea (Yassu!)',
    generatePlan: 'Use the Yassu Agent to create a comprehensive business plan with market analysis and strategy.',
    findAdvisors: 'Yassu will find matching Advisors and Ambassadors for your team invites.',
    formTeam: 'Form Your Yassu Team',
    presentFoundry: 'Present in Yassu Foundry',
  },
  navLabels: {
    howItWorks: 'How Yassu Works',
    ideas: 'Yassu Ideas',
    team: 'Yassu Team',
    ambassadors: 'Ambassadors',
    advisors: 'Advisors',
  },
  visionQuote: 'Yassu equalizes access to process.',
  joinButtonText: 'Join Yassu',
};

export const BRUIN_BRAND: BrandConfig = {
  id: 'bruin',
  name: 'Bruin Entrepreneurs',
  tagline: 'Where Bruin Ideas Become Companies',
  subtitle: 'Where Bruin Ideas Become Companies',
  description: 'The Yassu™ platform where UCLA Bruin Entrepreneurs uses AI, shared structure, and collaboration to build real companies.',
  logoPath: '/bruin-logo.png',
  contactEmail: 'hello@yassu.ai',
  copyrightName: 'Bruin Entrepreneurs',
  footerSlogan: 'UCLA\'s platform for student-led company creation',
  aiAssistantName: 'Kefi',
  basePath: '/bruin',
  canonicalUrl: 'https://yassu.ai/bruin',
  colors: {
    primary: '213 69% 38%',
    accent: '45 100% 51%',
    ring: '213 69% 38%',
    glowPrimary: '213 69% 48%',
    glowAccent: '45 100% 60%',
    gradientStart: '213 69% 45%',
    gradientEnd: '45 100% 55%',
    sidebarPrimary: '213 69% 38%',
    sidebarRing: '213 69% 38%',
  },
  universities: ['UCLA'],
  howItWorksSteps: {
    postIdea: 'Post an Idea',
    generatePlan: 'Use AI to create a comprehensive business plan with market analysis and strategy.',
    findAdvisors: 'Find matching Advisors and Ambassadors for your team invites.',
    formTeam: 'Form Your Team',
    presentFoundry: 'Present in the Foundry',
  },
  navLabels: {
    howItWorks: 'How Yassu x Bruin Work',
    ideas: 'Bruin Entrepreneurs Ideas',
    team: 'Yassu Team',
    ambassadors: 'Bruin Ambassadors',
    advisors: 'Yassu Advisors',
  },
  visionQuote: 'Bruin Entrepreneurs equalizes access to process.',
  joinButtonText: 'Join Now',
};

export function getBrandByPath(pathname: string): BrandConfig {
  if (/^\/bruin(\/|$)/i.test(pathname)) {
    return BRUIN_BRAND;
  }
  return YASSU_BRAND;
}
