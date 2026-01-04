import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MatchingNeeds {
  ideaTitle: string;
  ideaProblem: string;
  ideaSolution: string;
  targetUser: string;
  stage: string;
  rolesNeeded: string[];
}

export interface YassuMatch {
  userId: number;
  name: string;
  email: string;
  university: string;
  skills: string[];
  bio: string;
  matchScore: number;
  matchReason: string;
  role: string;
}

export interface LinkedInSuggestion {
  id: string;
  role: string;
  title: string;
  description: string;
  searchQuery: string;
  linkedinUrl: string;
  outreachTemplate: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SmartMatchingResult {
  yassuMatches: YassuMatch[];
  linkedinSuggestions: LinkedInSuggestion[];
  matchingStrategy: string;
}

/**
 * Generate smart matches for an idea
 */
export async function generateSmartMatches(
  needs: MatchingNeeds,
  yassuUsers: any[]
): Promise<SmartMatchingResult> {
  // Step 1: Analyze what roles are needed
  const rolesAnalysis = await analyzeRolesNeeded(needs);
  
  // Step 2: Match internal Yassu users
  const yassuMatches = await matchYassuUsers(needs, yassuUsers, rolesAnalysis);
  
  // Step 3: Generate LinkedIn suggestions
  const linkedinSuggestions = await generateLinkedInSuggestions(needs, rolesAnalysis);
  
  return {
    yassuMatches,
    linkedinSuggestions,
    matchingStrategy: rolesAnalysis.strategy,
  };
}

/**
 * Analyze what roles and skills are needed for the idea
 */
async function analyzeRolesNeeded(needs: MatchingNeeds): Promise<any> {
  const prompt = `Analyze this startup idea and determine what team members are needed:

Title: ${needs.ideaTitle}
Problem: ${needs.ideaProblem}
Solution: ${needs.ideaSolution}
Target User: ${needs.targetUser}
Current Stage: ${needs.stage}

Identify:
1. Top 3 roles needed (co-founder, advisor, or team member)
2. Required skills for each role
3. Priority (critical, important, nice-to-have)
4. Whether to find internally (students) or externally (professionals)

Return as JSON:
{
  "roles": [
    {
      "title": "Technical Co-Founder",
      "skills": ["React Native", "Node.js", "Mobile Development"],
      "priority": "critical",
      "searchInternal": true,
      "searchLinkedIn": false,
      "reason": "Need someone to build the mobile app"
    }
  ],
  "strategy": "Focus on finding technical co-founder first, then advisor"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert startup team builder. Analyze ideas and recommend ideal team composition.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    return analysis;
  } catch (error) {
    console.error('Error analyzing roles:', error);
    // Fallback to basic analysis
    return {
      roles: [
        {
          title: 'Co-Founder',
          skills: ['Business', 'Technical'],
          priority: 'critical',
          searchInternal: true,
          searchLinkedIn: false,
          reason: 'Need co-founder to build the startup',
        },
      ],
      strategy: 'Find co-founder first',
    };
  }
}

/**
 * Match internal Yassu users to the idea
 */
async function matchYassuUsers(
  needs: MatchingNeeds,
  yassuUsers: any[],
  rolesAnalysis: any
): Promise<YassuMatch[]> {
  const matches: YassuMatch[] = [];

  for (const user of yassuUsers) {
    // Calculate match score based on skills, interests, etc.
    const matchScore = calculateMatchScore(user, needs, rolesAnalysis);
    
    if (matchScore > 0.5) {
      const matchReason = generateMatchReason(user, needs, rolesAnalysis);
      const suggestedRole = suggestRole(user, rolesAnalysis);
      
      matches.push({
        userId: user.id,
        name: user.name || 'Anonymous',
        email: user.email,
        university: user.university_name || 'Unknown',
        skills: user.skills || [],
        bio: user.bio || '',
        matchScore,
        matchReason,
        role: suggestedRole,
      });
    }
  }

  // Sort by match score
  matches.sort((a, b) => b.matchScore - a.matchScore);
  
  // Return top 10
  return matches.slice(0, 10);
}

/**
 * Calculate match score between user and idea
 */
function calculateMatchScore(user: any, needs: MatchingNeeds, rolesAnalysis: any): number {
  let score = 0;
  
  // Base score for having a profile
  score += 0.2;
  
  // Skills match
  if (user.skills && user.skills.length > 0) {
    score += 0.3;
  }
  
  // Bio indicates interest
  if (user.bio && user.bio.length > 50) {
    score += 0.2;
  }
  
  // Same university (easier to collaborate)
  if (user.university_name) {
    score += 0.1;
  }
  
  // Has created ideas (active user)
  if (user.idea_count && user.idea_count > 0) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Generate reason why user matches
 */
function generateMatchReason(user: any, needs: MatchingNeeds, rolesAnalysis: any): string {
  const reasons = [];
  
  if (user.skills && user.skills.length > 0) {
    reasons.push(`Has relevant skills: ${user.skills.slice(0, 3).join(', ')}`);
  }
  
  if (user.university_name) {
    reasons.push(`Attends ${user.university_name}`);
  }
  
  if (user.idea_count && user.idea_count > 0) {
    reasons.push(`Active on Yassu with ${user.idea_count} ideas`);
  }
  
  return reasons.join('. ') || 'Potential team member';
}

/**
 * Suggest role for user based on their profile
 */
function suggestRole(user: any, rolesAnalysis: any): string {
  if (rolesAnalysis.roles && rolesAnalysis.roles.length > 0) {
    return rolesAnalysis.roles[0].title;
  }
  return 'Team Member';
}

/**
 * Generate LinkedIn search suggestions
 */
async function generateLinkedInSuggestions(
  needs: MatchingNeeds,
  rolesAnalysis: any
): Promise<LinkedInSuggestion[]> {
  const suggestions: LinkedInSuggestion[] = [];
  
  // Generate suggestions for each role that should be searched on LinkedIn
  const linkedInRoles = rolesAnalysis.roles?.filter((r: any) => r.searchLinkedIn) || [];
  
  for (const role of linkedInRoles) {
    const suggestion = await generateLinkedInSuggestion(needs, role);
    suggestions.push(suggestion);
  }
  
  // If no specific roles, generate generic advisor suggestion
  if (suggestions.length === 0) {
    suggestions.push(await generateGenericAdvisorSuggestion(needs));
  }
  
  return suggestions;
}

/**
 * Generate a LinkedIn suggestion for a specific role
 */
async function generateLinkedInSuggestion(
  needs: MatchingNeeds,
  role: any
): Promise<LinkedInSuggestion> {
  const prompt = `Generate a LinkedIn search strategy for finding this person:

Role: ${role.title}
Skills Needed: ${role.skills.join(', ')}
For Startup: ${needs.ideaTitle}
Industry: ${extractIndustry(needs)}

Generate:
1. LinkedIn search query (using site:linkedin.com and keywords)
2. Profile description of ideal candidate
3. Personalized outreach message template

Return as JSON:
{
  "searchQuery": "site:linkedin.com ...",
  "profileDescription": "...",
  "outreachTemplate": "Hi [Name], I'm a student at [University]..."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at finding the right people on LinkedIn for startups.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Build LinkedIn URL
    const searchTerms = result.searchQuery
      .replace('site:linkedin.com', '')
      .trim()
      .replace(/"/g, '')
      .split(' ')
      .filter((t: string) => t.length > 0)
      .join('%20');
    
    const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${searchTerms}`;
    
    return {
      id: `linkedin-${Date.now()}-${Math.random()}`,
      role: role.title,
      title: `${role.title} - ${extractIndustry(needs)} Expert`,
      description: result.profileDescription || `Looking for ${role.title} with experience in ${extractIndustry(needs)}`,
      searchQuery: result.searchQuery,
      linkedinUrl,
      outreachTemplate: result.outreachTemplate || generateDefaultOutreach(needs, role),
      priority: role.priority === 'critical' ? 'high' : 'medium',
    };
  } catch (error) {
    console.error('Error generating LinkedIn suggestion:', error);
    return generateFallbackSuggestion(needs, role);
  }
}

/**
 * Generate generic advisor suggestion
 */
async function generateGenericAdvisorSuggestion(needs: MatchingNeeds): Promise<LinkedInSuggestion> {
  const industry = extractIndustry(needs);
  const searchTerms = `${industry} advisor mentor startup`;
  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchTerms)}`;
  
  return {
    id: `linkedin-advisor-${Date.now()}`,
    role: 'Advisor',
    title: `${industry} Industry Advisor`,
    description: `Experienced professional in ${industry} who can provide strategic guidance`,
    searchQuery: `site:linkedin.com "${industry}" "advisor" OR "mentor" "startup"`,
    linkedinUrl,
    outreachTemplate: `Hi [Name],

I'm a student entrepreneur building ${needs.ideaTitle}, ${needs.ideaSolution.toLowerCase()}.

I came across your profile and was impressed by your experience in ${industry}. Would you be open to a brief call to share advice on ${extractKeyChallenge(needs)}?

I'd greatly appreciate 15-20 minutes of your time.

Best regards,
[Your Name]
[University]`,
    priority: 'medium',
  };
}

/**
 * Extract industry from idea
 */
function extractIndustry(needs: MatchingNeeds): string {
  const text = `${needs.ideaTitle} ${needs.ideaProblem} ${needs.ideaSolution}`.toLowerCase();
  
  if (text.includes('food') || text.includes('delivery') || text.includes('restaurant')) {
    return 'Food Delivery';
  }
  if (text.includes('education') || text.includes('learning') || text.includes('student')) {
    return 'EdTech';
  }
  if (text.includes('health') || text.includes('fitness') || text.includes('wellness')) {
    return 'HealthTech';
  }
  if (text.includes('social') || text.includes('community') || text.includes('network')) {
    return 'Social';
  }
  if (text.includes('finance') || text.includes('payment') || text.includes('money')) {
    return 'FinTech';
  }
  
  return 'Technology';
}

/**
 * Extract key challenge from idea
 */
function extractKeyChallenge(needs: MatchingNeeds): string {
  // Extract first sentence or first 100 chars of problem
  const problem = needs.ideaProblem;
  const firstSentence = problem.split('.')[0];
  return firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
}

/**
 * Generate default outreach template
 */
function generateDefaultOutreach(needs: MatchingNeeds, role: any): string {
  return `Hi [Name],

I'm a student entrepreneur working on ${needs.ideaTitle}. We're ${needs.ideaSolution.toLowerCase()}.

I came across your profile and was impressed by your experience with ${role.skills[0]}. Would you be interested in learning more about our project?

I'd love to get your perspective on ${extractKeyChallenge(needs)}.

Best regards,
[Your Name]
[University]`;
}

/**
 * Generate fallback suggestion if AI fails
 */
function generateFallbackSuggestion(needs: MatchingNeeds, role: any): LinkedInSuggestion {
  const industry = extractIndustry(needs);
  const keywords = role.skills.slice(0, 2).join(' ');
  const searchTerms = `${industry} ${keywords}`;
  const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchTerms)}`;
  
  return {
    id: `linkedin-${Date.now()}-${Math.random()}`,
    role: role.title,
    title: `${role.title} - ${industry}`,
    description: `Looking for ${role.title} with ${keywords} experience`,
    searchQuery: `site:linkedin.com "${industry}" "${keywords}"`,
    linkedinUrl,
    outreachTemplate: generateDefaultOutreach(needs, role),
    priority: 'medium',
  };
}
