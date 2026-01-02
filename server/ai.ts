import OpenAI from "openai";

// Use Replit AI Integrations - no personal API key required
// Charges are billed to your Replit credits
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface IdeaInput {
  title: string;
  problem: string;
  solution?: string;
  targetUser?: string;
  whyNow?: string;
}

interface BusinessPlanSections {
  executiveSummary: string;
  founderFit: string;
  competitiveLandscape: string;
  riskMoat: string;
  mvpDesign: string;
  teamTalent: string;
  launchPlan: string;
  schoolAdvantage: string;
  fundingPitch: string;
}

export async function generateBusinessPlan(idea: IdeaInput): Promise<BusinessPlanSections> {
  const systemPrompt = `You are an expert startup advisor and business strategist. 
You help university students develop their startup ideas into comprehensive business plans.
Be encouraging but realistic. Provide actionable insights.`;

  const userPrompt = `Generate a comprehensive business plan for this startup idea:

**Title:** ${idea.title}
**Problem:** ${idea.problem}
${idea.solution ? `**Solution:** ${idea.solution}` : ''}
${idea.targetUser ? `**Target Users:** ${idea.targetUser}` : ''}
${idea.whyNow ? `**Why Now:** ${idea.whyNow}` : ''}

Please provide detailed analysis for each of these 8 sections:

1. EXECUTIVE SUMMARY
- Problem statement (2-3 sentences)
- Solution overview
- Target market
- Key differentiators

2. IDEA-FOUNDER FIT
- Evaluate how well-suited a student founder would be for this idea
- Required skills and expertise
- Personal connection to the problem
- Learning opportunities

3. COMPETITIVE LANDSCAPE
- Existing solutions and competitors
- Market gaps and opportunities
- Competitive advantages
- Barriers to entry

4. RISK & MOAT
- Key risks and mitigation strategies
- Potential moat/defensibility
- Technical risks
- Market risks

5. MVP DESIGN
- Core features for MVP
- Tech stack recommendations
- Timeline to launch (in weeks)
- Key milestones

6. TEAM & TALENT
- Ideal co-founder profiles
- Key roles to fill first
- Skills gaps to address
- Advisory needs

7. LAUNCH PLAN
- Pre-launch activities
- Launch strategy
- Early traction tactics
- Success metrics

8. SCHOOL ADVANTAGE
- How to leverage university resources
- Relevant programs/competitions
- Campus as testing ground
- Alumni network opportunities

9. FUNDING PITCH
- Funding requirements
- Use of funds
- Potential investor types
- Key pitch points

Format each section with clear headers and bullet points where appropriate.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 4000,
    });

    const fullContent = response.choices[0]?.message?.content || "";

    // Parse the response into sections
    const sections = parseSections(fullContent);
    return sections;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate business plan");
  }
}

function parseSections(content: string): BusinessPlanSections {
  const sectionPatterns = [
    { key: 'executiveSummary', patterns: ['EXECUTIVE SUMMARY', '1.', '1)'] },
    { key: 'founderFit', patterns: ['IDEA-FOUNDER FIT', 'FOUNDER FIT', '2.', '2)'] },
    { key: 'competitiveLandscape', patterns: ['COMPETITIVE LANDSCAPE', '3.', '3)'] },
    { key: 'riskMoat', patterns: ['RISK & MOAT', 'RISK AND MOAT', '4.', '4)'] },
    { key: 'mvpDesign', patterns: ['MVP DESIGN', '5.', '5)'] },
    { key: 'teamTalent', patterns: ['TEAM & TALENT', 'TEAM AND TALENT', '6.', '6)'] },
    { key: 'launchPlan', patterns: ['LAUNCH PLAN', '7.', '7)'] },
    { key: 'schoolAdvantage', patterns: ['SCHOOL ADVANTAGE', '8.', '8)'] },
    { key: 'fundingPitch', patterns: ['FUNDING PITCH', '9.', '9)'] },
  ];

  const result: Record<string, string> = {};
  const lines = content.split('\n');
  let currentSection = 'executiveSummary';
  let currentContent: string[] = [];

  for (const line of lines) {
    const upperLine = line.toUpperCase().trim();
    
    let foundSection = false;
    for (const section of sectionPatterns) {
      for (const pattern of section.patterns) {
        if (upperLine.includes(pattern.toUpperCase()) && 
            (upperLine.startsWith('#') || upperLine.startsWith('**') || 
             upperLine.match(/^\d+[\.\)]/) || upperLine === pattern.toUpperCase())) {
          // Save previous section
          if (currentContent.length > 0) {
            result[currentSection] = currentContent.join('\n').trim();
          }
          currentSection = section.key;
          currentContent = [];
          foundSection = true;
          break;
        }
      }
      if (foundSection) break;
    }

    if (!foundSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    result[currentSection] = currentContent.join('\n').trim();
  }

  // Ensure all sections exist
  return {
    executiveSummary: result.executiveSummary || 'Analysis pending...',
    founderFit: result.founderFit || 'Analysis pending...',
    competitiveLandscape: result.competitiveLandscape || 'Analysis pending...',
    riskMoat: result.riskMoat || 'Analysis pending...',
    mvpDesign: result.mvpDesign || 'Analysis pending...',
    teamTalent: result.teamTalent || 'Analysis pending...',
    launchPlan: result.launchPlan || 'Analysis pending...',
    schoolAdvantage: result.schoolAdvantage || 'Analysis pending...',
    fundingPitch: result.fundingPitch || 'Analysis pending...',
  };
}
