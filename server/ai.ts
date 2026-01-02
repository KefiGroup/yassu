import { GoogleGenAI } from "@google/genai";
import { batchProcess } from "./replit_integrations/batch";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
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

interface SectionPrompt {
  key: keyof BusinessPlanSections;
  title: string;
  prompt: string;
}

function buildSectionPrompts(idea: IdeaInput): SectionPrompt[] {
  const ideaContext = `
STARTUP IDEA:
Title: ${idea.title}
Problem: ${idea.problem}
${idea.solution ? `Solution: ${idea.solution}` : "Solution: To be defined based on problem analysis"}
${idea.targetUser ? `Target Users: ${idea.targetUser}` : "Target Users: To be identified"}
${idea.whyNow ? `Why Now: ${idea.whyNow}` : ""}
`.trim();

  return [
    {
      key: "founderFit",
      title: "Idea-Founder Fit",
      prompt: `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

${ideaContext}

Generate a detailed IDEA-FOUNDER FIT analysis in markdown format. Cover:

## Problem Statement & Validation
- Restate the core problem in 2-3 sentences
- Who experiences this pain most acutely?
- How can the founder validate this is a real problem?

## Founder Motivation Assessment
- What personal connection might a student founder have to this problem?
- Required domain expertise vs. learnable skills
- Red flags if founder lacks certain backgrounds
- Passion sustainability score (1-10) with reasoning

## Initial Hypothesis Framework
- Core assumption to test first
- Falsifiable hypotheses (at least 3)
- Minimum viable experiment to validate
- Expected learning timeline

Be specific, actionable, and brutally honest. Use bullet points and clear structure.`,
    },
    {
      key: "competitiveLandscape",
      title: "Competitive Landscape",
      prompt: `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

${ideaContext}

Generate a detailed COMPETITIVE LANDSCAPE analysis in markdown format. Cover:

## Market Map
- Industry/sector categorization
- Market size estimation (TAM, SAM, SOM)
- Key market trends driving opportunity
- Regulatory or environmental factors

## Competitor Grid
Create a comparison table with columns:
| Competitor | Type | Strengths | Weaknesses | Pricing | Target Segment |

Include:
- 3-5 direct competitors (name real companies if they exist)
- 2-3 indirect competitors/substitutes
- Status quo (doing nothing) as a competitor

## Whitespace Analysis
- Specific gaps in current market offerings
- Underserved customer segments
- Unmet needs or pain points
- Your potential wedge/entry point
- Sustainable differentiation strategy

Be specific with company names and data. Use tables and bullet points.`,
    },
    {
      key: "riskMoat",
      title: "Risk & Moat Analysis",
      prompt: `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

${ideaContext}

Generate a detailed RISK & MOAT analysis in markdown format. Cover:

## SWOT Analysis
| Strengths | Weaknesses |
|-----------|------------|
| ... | ... |

| Opportunities | Threats |
|---------------|---------|
| ... | ... |

## Defensibility Score (1-10)
Rate and explain potential moats:
- Network effects potential
- Switching costs
- Data/AI advantage
- Brand/trust building
- Economies of scale
- Regulatory barriers

## Top 5 Kill Risks
For each risk:
1. **[Risk Name]**
   - Severity: High/Medium/Low
   - Likelihood: High/Medium/Low
   - Description: What could happen
   - Mitigation: Specific action to reduce risk
   - Early warning signs: How to detect

## Risk Mitigation Roadmap
- First 30 days priorities
- 90-day risk reduction plan
- 1-year defensive strategy

Be brutally honest about risks. Founders need truth, not comfort.`,
    },
    {
      key: "mvpDesign",
      title: "Product MVP Design",
      prompt: `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

${ideaContext}

Generate a detailed MVP DESIGN analysis in markdown format. Cover:

## Feature Backlog (Prioritized)
| Priority | Feature | User Value | Effort | MVP? |
|----------|---------|------------|--------|------|
| P0 | ... | ... | S/M/L | Yes |
| P1 | ... | ... | S/M/L | Maybe |
| P2 | ... | ... | S/M/L | No |

Include 8-12 features, clearly marking MVP vs. post-MVP.

## MVP Specification
- Core user flow (step by step)
- Essential screens/pages (list with purpose)
- Data model (key entities and relationships)
- Integration requirements (APIs, services)

## Tech Stack Recommendation
- Frontend: [choice] - rationale
- Backend: [choice] - rationale
- Database: [choice] - rationale
- Hosting: [choice] - rationale
- Key libraries/services

## Development Milestones
| Week | Milestone | Deliverable | Success Criteria |
|------|-----------|-------------|------------------|
| 1-2 | ... | ... | ... |
| 3-4 | ... | ... | ... |
| 5-6 | ... | ... | ... |
| 7-8 | Launch | MVP live | First users acquired |

Be specific about technology choices. Students need concrete guidance.`,
    },
    {
      key: "teamTalent",
      title: "Team & Talent Strategy",
      prompt: `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

${ideaContext}

Generate a detailed TEAM & TALENT strategy in markdown format. Cover:

## Skill Matrix Required
| Skill | Priority | Level Needed | In-house vs Outsource |
|-------|----------|--------------|----------------------|
| ... | Critical/Important/Nice | Expert/Competent/Basic | ... |

## Ideal Co-Founder Profiles
For each recommended co-founder role:
1. **[Role Title]**
   - Background: Ideal prior experience
   - Skills: Must-have capabilities
   - Personality: Complementary traits
   - Where to find: Specific places on campus

## First 3 Hires (Post-Founding)
1. [Role] - Why this role first, estimated timing
2. [Role] - Dependencies on role 1
3. [Role] - Growth stage hire

## Outreach Templates
Provide 2 ready-to-use templates:

**Co-Founder Outreach (LinkedIn/Email):**
\`\`\`
Subject: [Template]
Body: [Template with placeholders]
\`\`\`

**Advisor Ask Template:**
\`\`\`
Subject: [Template]
Body: [Template with placeholders]
\`\`\`

## Campus Recruiting Strategy
- Student orgs to partner with
- Classes with relevant talent
- Events to attend/host
- Professor connections to make`,
    },
    {
      key: "launchPlan",
      title: "Go-to-Market Launch",
      prompt: `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

${ideaContext}

Generate a detailed GO-TO-MARKET strategy in markdown format. Cover:

## Marketing Calendar (12 Weeks)
| Week | Phase | Activities | Goals |
|------|-------|------------|-------|
| 1-2 | Pre-launch | ... | ... |
| 3-4 | Pre-launch | ... | ... |
| 5-6 | Soft launch | ... | ... |
| 7-8 | Launch | ... | ... |
| 9-10 | Growth | ... | ... |
| 11-12 | Optimize | ... | ... |

## Channel Strategy
For each channel, rate Priority (1-5) and provide tactics:

1. **Organic Social** (Priority: X/5)
   - Platforms to focus on
   - Content themes
   - Posting cadence

2. **Campus Marketing** (Priority: X/5)
   - Specific tactics
   - Events and partnerships

3. **Referral/Viral** (Priority: X/5)
   - Referral mechanism
   - Viral loops

4. **Content/SEO** (Priority: X/5)
   - Content strategy
   - Keyword targets

5. **Paid Acquisition** (Priority: X/5)
   - When to start
   - Budget allocation

## Launch Checklist
Week before launch:
- [ ] [Specific task]
- [ ] [Specific task]
...

Launch day:
- [ ] [Specific task]
- [ ] [Specific task]
...

Week after launch:
- [ ] [Specific task]
- [ ] [Specific task]
...

## Success Metrics
| Metric | Week 4 Target | Week 8 Target | Week 12 Target |
|--------|---------------|---------------|----------------|
| Users | ... | ... | ... |
| Engagement | ... | ... | ... |
| Revenue | ... | ... | ... |`,
    },
    {
      key: "schoolAdvantage",
      title: "University Advantage",
      prompt: `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

${ideaContext}

Generate a detailed UNIVERSITY ADVANTAGE strategy in markdown format. Cover:

## School Resources Inventory
| Resource Type | Examples | How to Access | Value for This Startup |
|---------------|----------|---------------|----------------------|
| Entrepreneurship Centers | ... | ... | High/Med/Low |
| Grants/Competitions | ... | ... | High/Med/Low |
| Faculty Expertise | ... | ... | High/Med/Low |
| Labs/Equipment | ... | ... | High/Med/Low |
| Student Talent | ... | ... | High/Med/Low |

## Key Contacts to Make
1. **[Title/Department]**
   - Why: Specific value they provide
   - How to connect: Approach strategy
   - Ask: What to request

2. **[Title/Department]**
   - Why: ...
   - How to connect: ...
   - Ask: ...

(List 5-7 key contacts)

## Competition & Grant Roadmap
| Opportunity | Deadline | Award | Fit Score | Prep Required |
|-------------|----------|-------|-----------|---------------|
| ... | ... | ... | 1-5 | ... |

(List 5-8 relevant opportunities)

## Campus as Testing Ground
- **Pilot opportunities:** Where to test on campus
- **Student segments:** Who to target first
- **Feedback loops:** How to iterate quickly
- **Scale path:** Campus to city to national

## Alumni Network Activation
- Notable alumni in relevant industries
- Alumni groups to engage
- Mentorship program access
- Investment potential from alumni`,
    },
    {
      key: "fundingPitch",
      title: "Funding & Pitch Strategy",
      prompt: `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

${ideaContext}

Generate a detailed FUNDING & PITCH strategy in markdown format. Cover:

## One-Page Pitch Summary
Create a structured one-pager:

**THE PROBLEM**
[2-3 sentences]

**THE SOLUTION**
[2-3 sentences]

**MARKET OPPORTUNITY**
[TAM/SAM/SOM with numbers]

**BUSINESS MODEL**
[How you make money]

**TRACTION** (target for fundraise)
[Key metrics to hit]

**THE ASK**
[Amount and use of funds]

## Grant & Competition List
| Name | Amount | Deadline | Requirements | Fit |
|------|--------|----------|--------------|-----|
| ... | ... | ... | ... | High/Med |

(Include 8-10 relevant grants/competitions)

## Investor Email Templates

**Warm Intro Request:**
\`\`\`
Subject: [Template]
Body: [Template with placeholders]
\`\`\`

**Cold Outreach:**
\`\`\`
Subject: [Template]  
Body: [Template with placeholders]
\`\`\`

**Follow-up After Meeting:**
\`\`\`
Subject: [Template]
Body: [Template with placeholders]
\`\`\`

## Funding Roadmap
| Stage | Amount | Timeline | Milestones to Hit First |
|-------|--------|----------|------------------------|
| Pre-seed | ... | ... | ... |
| Seed | ... | ... | ... |
| Series A | ... | ... | ... |

## Common Objections & Rebuttals
| Objection | Rebuttal |
|-----------|----------|
| "Market too small" | ... |
| "No technical moat" | ... |
| "Team inexperience" | ... |
| "Competition" | ... |`,
    },
  ];
}

export async function generateBusinessPlan(idea: IdeaInput): Promise<BusinessPlanSections> {
  const sectionPrompts = buildSectionPrompts(idea);
  
  console.log(`[AI] Starting parallel generation of ${sectionPrompts.length} sections using Gemini 2.5 Flash`);
  
  const results = await batchProcess(
    sectionPrompts,
    async (section, index) => {
      console.log(`[AI] Generating section ${index + 1}/${sectionPrompts.length}: ${section.title}`);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: section.prompt,
        config: {
          maxOutputTokens: 2000,
          temperature: 0.7,
        },
      });
      
      const content = response.text || `## ${section.title}\n\nGeneration failed. Please try again.`;
      console.log(`[AI] Completed section: ${section.title} (${content.length} chars)`);
      
      return { key: section.key, content };
    },
    {
      concurrency: 4,
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 30000,
      onProgress: (completed, total) => {
        console.log(`[AI] Progress: ${completed}/${total} sections complete`);
      },
    }
  );
  
  const executiveSummary = await generateExecutiveSummary(idea, results);
  
  const sections: BusinessPlanSections = {
    executiveSummary,
    founderFit: "",
    competitiveLandscape: "",
    riskMoat: "",
    mvpDesign: "",
    teamTalent: "",
    launchPlan: "",
    schoolAdvantage: "",
    fundingPitch: "",
  };
  
  for (const result of results) {
    sections[result.key] = result.content;
  }
  
  console.log("[AI] Business plan generation complete");
  return sections;
}

async function generateExecutiveSummary(
  idea: IdeaInput,
  sectionResults: { key: string; content: string }[]
): Promise<string> {
  const sectionSummaries = sectionResults
    .map((r) => `${r.key}: ${r.content.slice(0, 500)}...`)
    .join("\n\n");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

Based on the detailed analysis sections below, create a compelling EXECUTIVE SUMMARY for this startup:

STARTUP IDEA:
Title: ${idea.title}
Problem: ${idea.problem}
${idea.solution ? `Solution: ${idea.solution}` : ""}
${idea.targetUser ? `Target Users: ${idea.targetUser}` : ""}

ANALYSIS HIGHLIGHTS:
${sectionSummaries}

Generate an Executive Summary in markdown format covering:

## Executive Summary

### The Opportunity
- Problem statement (2-3 sentences, compelling)
- Market size and timing

### The Solution
- Core value proposition
- Key differentiators

### Traction Path
- First milestones to hit
- Path to scale

### The Ask
- What's needed to succeed
- Key risks acknowledged

Keep it to ~400 words. Make it compelling enough to hook an investor or co-founder.`,
    config: {
      maxOutputTokens: 1000,
      temperature: 0.7,
    },
  });

  return response.text || "## Executive Summary\n\nGeneration pending...";
}
