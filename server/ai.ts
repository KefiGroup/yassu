import OpenAI from "openai";

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

const SYSTEM_PROMPT = `You are an elite startup strategist at Yassu, "The New-Age Marketplace for University-Native Company Creation." Yassu is a foundry (not an accelerator) that combines the community-building power of early Facebook with the startup expertise of Y Combinator.

Your role is to provide brutally honest yet encouraging business analysis for university student founders. You understand:
- The unique advantages of student founders (time, access to campus, low burn rate, network of talented peers)
- The challenges they face (limited experience, academic commitments, resource constraints)
- How to leverage university ecosystems (grants, competitions, professors, alumni networks, campus as testing ground)

Your analysis style:
- Be direct and actionable, not vague or generic
- Provide specific examples and concrete next steps
- Acknowledge risks honestly while showing paths forward
- Think like a Y Combinator partner giving office hours feedback
- Reference real companies or strategies as inspiration when relevant
- Keep each section focused and substantive (3-5 paragraphs each)

Format your output as clean, readable markdown with bullet points where appropriate.`;

export async function generateBusinessPlan(idea: IdeaInput): Promise<BusinessPlanSections> {
  const userPrompt = `Analyze this startup idea and generate a comprehensive 9-section business plan:

## IDEA DETAILS
**Title:** ${idea.title}
**Problem:** ${idea.problem}
${idea.solution ? `**Proposed Solution:** ${idea.solution}` : '**Proposed Solution:** Not yet defined - please suggest an approach based on the problem.'}
${idea.targetUser ? `**Target Users:** ${idea.targetUser}` : '**Target Users:** To be determined - suggest the ideal initial customer segment.'}
${idea.whyNow ? `**Why Now (Market Timing):** ${idea.whyNow}` : ''}

---

Generate a detailed JSON response with exactly these 9 sections. Each section should be 200-400 words of substantive analysis in markdown format:

{
  "executiveSummary": "## Executive Summary\n\nStart with a compelling one-sentence pitch. Then cover:\n- The core problem and who experiences it\n- The solution approach and key insight\n- Target market size and initial beachhead\n- Why this team/timing is right\n- The ask or next milestone",

  "founderFit": "## Idea-Founder Fit Analysis\n\nEvaluate honestly:\n- What personal connection or insight might a student founder have to this problem?\n- Required skills: technical, domain expertise, sales ability\n- What can be learned vs. what must be brought to the table\n- Red flags if the founder lacks certain backgrounds\n- Ideal founder archetype for this idea",

  "competitiveLandscape": "## Competitive Landscape\n\nMap the competitive terrain:\n- Direct competitors (name specific companies if they exist)\n- Indirect competitors and substitutes\n- Why existing solutions fall short\n- The specific gap or wedge this startup exploits\n- Competitive moat potential (network effects, switching costs, etc.)",

  "riskMoat": "## Risk Assessment & Defensibility\n\nBe brutally honest about risks:\n- Top 3 risks that could kill this startup\n- Market risks (demand, timing, regulation)\n- Execution risks (technology, operations, hiring)\n- Competitive risks (incumbents, well-funded startups)\n- Mitigation strategies for each major risk\n- Path to building a defensible moat",

  "mvpDesign": "## MVP Design & Technical Approach\n\nDefine the minimum viable product:\n- Core feature set (ruthlessly prioritized)\n- What to explicitly exclude from v1\n- Recommended tech stack with rationale\n- Build vs. buy decisions\n- Timeline: realistic weeks to launch MVP\n- Key technical risks and unknowns",

  "teamTalent": "## Team Building & Talent Strategy\n\nDefine the founding team needs:\n- Ideal co-founder profile(s) with specific skills\n- First 3 hires after co-founders\n- Where to find these people on campus\n- Advisory board composition\n- Skills gaps and how to address them\n- Equity and compensation considerations for students",

  "launchPlan": "## Go-to-Market & Launch Strategy\n\nCreate a concrete launch playbook:\n- Pre-launch: building waitlist and validating demand\n- Launch week: specific tactics and channels\n- First 100 users: acquisition strategy\n- First 1000 users: scaling approach\n- Key metrics to track from day one\n- Marketing budget and resource allocation",

  "schoolAdvantage": "## University Ecosystem Leverage\n\nMaximize the campus advantage:\n- Specific grants, competitions, or programs to apply for\n- How to use campus as a testing ground\n- Professor or department connections to pursue\n- Student organizations for partnerships\n- Alumni network activation strategy\n- Career center or entrepreneurship center resources",

  "fundingPitch": "## Funding Strategy & Investor Pitch\n\nPlan the capital journey:\n- Pre-seed/seed funding requirements with use of funds\n- Ideal investor profiles (angels, micro-VCs, university funds)\n- Key metrics needed before raising\n- The 30-second pitch for this idea\n- Common investor objections and rebuttals\n- Alternative paths: bootstrapping, grants, revenue"
}

IMPORTANT: Return ONLY valid JSON. Each field value should be a complete markdown-formatted section. Use \\n for newlines within strings. Do not include any text before or after the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 6000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    
    try {
      const parsed = JSON.parse(content) as Partial<BusinessPlanSections>;
      
      return {
        executiveSummary: parsed.executiveSummary || generateFallback("Executive Summary"),
        founderFit: parsed.founderFit || generateFallback("Idea-Founder Fit"),
        competitiveLandscape: parsed.competitiveLandscape || generateFallback("Competitive Landscape"),
        riskMoat: parsed.riskMoat || generateFallback("Risk Assessment"),
        mvpDesign: parsed.mvpDesign || generateFallback("MVP Design"),
        teamTalent: parsed.teamTalent || generateFallback("Team & Talent"),
        launchPlan: parsed.launchPlan || generateFallback("Launch Plan"),
        schoolAdvantage: parsed.schoolAdvantage || generateFallback("School Advantage"),
        fundingPitch: parsed.fundingPitch || generateFallback("Funding Strategy"),
      };
    } catch (parseError) {
      console.error("JSON parse error, attempting fallback extraction:", parseError);
      return extractSectionsFromText(content);
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate business plan. Please try again.");
  }
}

function generateFallback(sectionName: string): string {
  return `## ${sectionName}\n\nThis section could not be generated. Please try regenerating the business plan or provide more details about your idea.`;
}

function extractSectionsFromText(content: string): BusinessPlanSections {
  const sectionMap: Record<string, keyof BusinessPlanSections> = {
    'executive summary': 'executiveSummary',
    'founder fit': 'founderFit',
    'idea-founder fit': 'founderFit',
    'competitive landscape': 'competitiveLandscape',
    'risk': 'riskMoat',
    'moat': 'riskMoat',
    'defensibility': 'riskMoat',
    'mvp': 'mvpDesign',
    'technical': 'mvpDesign',
    'team': 'teamTalent',
    'talent': 'teamTalent',
    'launch': 'launchPlan',
    'go-to-market': 'launchPlan',
    'school': 'schoolAdvantage',
    'university': 'schoolAdvantage',
    'campus': 'schoolAdvantage',
    'funding': 'fundingPitch',
    'investor': 'fundingPitch',
    'pitch': 'fundingPitch',
  };

  const result: Partial<BusinessPlanSections> = {};
  const sections = content.split(/#{1,3}\s+/);

  for (const section of sections) {
    if (!section.trim()) continue;
    
    const firstLine = section.split('\n')[0].toLowerCase();
    
    for (const [keyword, field] of Object.entries(sectionMap)) {
      if (firstLine.includes(keyword) && !result[field]) {
        result[field] = `## ${section.split('\n')[0]}\n\n${section.split('\n').slice(1).join('\n').trim()}`;
        break;
      }
    }
  }

  return {
    executiveSummary: result.executiveSummary || generateFallback("Executive Summary"),
    founderFit: result.founderFit || generateFallback("Idea-Founder Fit"),
    competitiveLandscape: result.competitiveLandscape || generateFallback("Competitive Landscape"),
    riskMoat: result.riskMoat || generateFallback("Risk Assessment"),
    mvpDesign: result.mvpDesign || generateFallback("MVP Design"),
    teamTalent: result.teamTalent || generateFallback("Team & Talent"),
    launchPlan: result.launchPlan || generateFallback("Launch Plan"),
    schoolAdvantage: result.schoolAdvantage || generateFallback("School Advantage"),
    fundingPitch: result.fundingPitch || generateFallback("Funding Strategy"),
  };
}
