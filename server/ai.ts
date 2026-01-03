import { GoogleGenAI } from "@google/genai";
import { batchProcess } from "./replit_integrations/batch";

const geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
const geminiBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;

if (!geminiApiKey) {
  console.error("[AI] Warning: AI_INTEGRATIONS_GEMINI_API_KEY is not set");
}

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    apiVersion: "",
    baseUrl: geminiBaseUrl,
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

  const outputRules = `

CRITICAL OUTPUT RULES:
1. DO NOT include any introduction, greeting, or preamble. Start directly with the content.
2. DO NOT write "As an expert..." or similar phrases.
3. For tables, use proper markdown format with header row and separator row:
   | Column1 | Column2 | Column3 |
   |---------|---------|---------|
   | Data1   | Data2   | Data3   |
4. Every table MUST have data rows, not just headers.
5. Use clear section headings but skip the main title (it's already shown in the UI).
6. Be concise and actionable.`;

  return [
    {
      key: "founderFit",
      title: "Idea-Founder Fit",
      prompt: `Analyze this startup idea and generate IDEA-FOUNDER FIT content.

${ideaContext}

Generate the following sections in clean markdown format. Cover:

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
${outputRules}`,
    },
    {
      key: "competitiveLandscape",
      title: "Competitive Landscape",
      prompt: `Analyze this startup idea and generate COMPETITIVE LANDSCAPE content.

${ideaContext}

Generate the following sections in clean markdown format:

## Market Map
- Industry/sector categorization
- Market size estimation (TAM, SAM, SOM)
- Key market trends driving opportunity

## Competitor Grid

Create a markdown table with these exact columns: Competitor | Type | Strengths | Weaknesses | Pricing | Target Segment

IMPORTANT: You MUST populate this table with 4-6 REAL competitor companies. Do NOT leave the table empty or use placeholders. Research and include actual companies that compete in this space. Include at least one direct competitor, one indirect competitor, and the "Status Quo" (what customers currently do without a dedicated solution).

## Whitespace Analysis
- Specific gaps in current market offerings
- Underserved customer segments
- Your potential wedge/entry point
${outputRules}`,
    },
    {
      key: "riskMoat",
      title: "Risk & Moat Analysis",
      prompt: `Analyze this startup idea and generate RISK & MOAT content.

${ideaContext}

Generate the following sections in clean markdown format:

## SWOT Analysis

Create a SWOT table with two columns: Category | Analysis. Populate each row with real analysis:
- Strengths: List 3-4 specific strengths of this startup idea
- Weaknesses: List 3-4 specific weaknesses or challenges  
- Opportunities: List 3-4 market opportunities to leverage
- Threats: List 3-4 external threats to watch for

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
${outputRules}`,
    },
    {
      key: "mvpDesign",
      title: "Product MVP Design",
      prompt: `Analyze this startup idea and generate MVP DESIGN content.

${ideaContext}

Generate the following sections in clean markdown format:

## Feature Backlog

| Priority | Feature | User Value | Effort | MVP? |
|----------|---------|------------|--------|------|
| P0 | User onboarding | Core functionality | M | Yes |
| P0 | [Feature 2] | ... | S/M/L | Yes |
| P1 | [Feature 3] | ... | S/M/L | Maybe |
| P2 | [Feature 4] | ... | S/M/L | No |

Include 6-8 features with real names, clearly marking MVP vs. post-MVP.

## MVP Specification
- Core user flow (step by step)
- Essential screens/pages (list with purpose)
- Key data entities

## Tech Stack Recommendation
- Frontend: [specific choice] - rationale
- Backend: [specific choice] - rationale
- Database: [specific choice] - rationale

## Development Milestones

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1-2 | Setup & Design | Wireframes, tech setup |
| 3-4 | Core Features | Main functionality |
| 5-6 | Polish | Testing, fixes |
| 7-8 | Launch | MVP live |
${outputRules}`,
    },
    {
      key: "teamTalent",
      title: "Team & Talent Strategy",
      prompt: `Analyze this startup idea and generate TEAM & TALENT content.

${ideaContext}

IMPORTANT: For the Skill Matrix, you MUST use skills from this exact list (pick the most relevant 6-8 skills):

Technical Skills: JavaScript, TypeScript, Python, Java, C++, React, Vue.js, Angular, Node.js, Django, FastAPI, Machine Learning, Deep Learning, Data Science, TensorFlow, PyTorch, AWS, Google Cloud, Docker, Kubernetes, PostgreSQL, MongoDB

Design Skills: UI/UX Design, Figma, Product Design, Graphic Design, User Research, Prototyping

Business Skills: Product Management, Project Management, Business Development, Sales, Marketing, Growth Hacking, SEO/SEM, Content Marketing, Financial Modeling, Fundraising

Leadership Skills: Team Leadership, Strategic Planning, People Management, Agile/Scrum, Public Speaking

Generate the following sections in clean markdown format:

## Required Skills

<!-- SKILLS_JSON_START -->
[List the exact skill names from the list above, comma-separated, e.g.: "React, Node.js, Python, UI/UX Design, Product Management"]
<!-- SKILLS_JSON_END -->

## Skill Matrix

| Skill | Priority | Level Needed | Why Needed |
|-------|----------|--------------|------------|
| [Exact skill from list] | Critical | Expert | [Brief reason] |
| [Exact skill from list] | Critical | Competent | [Brief reason] |
| [Exact skill from list] | Important | Competent | [Brief reason] |

Include 6-8 skills using EXACT names from the list above.

## Ideal Co-Founder Profiles

### Technical Co-Founder
- Background: [specific experience needed]
- Required Skills: [skills from the list above]
- Where to find: [specific places on campus]

### Business Co-Founder
- Background: [specific experience needed]
- Required Skills: [skills from the list above]
- Where to find: [specific places on campus]

## First 3 Hires (Post-Founding)
1. [Role 1] - Why first, key skills needed
2. [Role 2] - Dependencies
3. [Role 3] - Growth stage

## Campus Recruiting Strategy
- Student orgs to partner with
- Classes with relevant talent
- Events to attend
${outputRules}`,
    },
    {
      key: "launchPlan",
      title: "Go-to-Market Launch",
      prompt: `Analyze this startup idea and generate GO-TO-MARKET content.

${ideaContext}

Generate the following sections in clean markdown format:

## Marketing Calendar (12 Weeks)

| Week | Phase | Activities | Goals |
|------|-------|------------|-------|
| 1-2 | Pre-launch | Build landing page, email list | 100 signups |
| 3-4 | Pre-launch | Content creation, outreach | 500 signups |
| 5-6 | Soft launch | Beta with early users | 50 active users |
| 7-8 | Launch | Public launch | 200 users |
| 9-10 | Growth | Paid ads, partnerships | 500 users |
| 11-12 | Optimize | A/B testing, retention | 1000 users |

Fill in with specific activities and realistic goals.

## Channel Strategy

### Organic Social (Priority: X/5)
- Platforms to focus on
- Content themes
- Posting cadence

### Campus Marketing (Priority: X/5)
- Specific tactics
- Events and partnerships

### Referral Program (Priority: X/5)
- Referral mechanism
- Incentive structure

## Launch Checklist
**Week before:** Key preparation tasks
**Launch day:** Critical actions
**Week after:** Follow-up tasks

## Success Metrics

| Metric | Week 4 | Week 8 | Week 12 |
|--------|--------|--------|---------|
| Users | 200 | 500 | 1000 |
| Engagement | 30% | 40% | 50% |
| Revenue | $0 | $500 | $2000 |

Fill in with realistic targets.
${outputRules}`,
    },
    {
      key: "schoolAdvantage",
      title: "University Advantage",
      prompt: `Analyze this startup idea and generate UNIVERSITY ADVANTAGE content.

${ideaContext}

Generate the following sections in clean markdown format:

## School Resources Inventory

| Resource Type | Examples | How to Access | Value |
|---------------|----------|---------------|-------|
| Entrepreneurship Centers | Incubators, accelerators | Apply online | High |
| Grants/Competitions | Pitch competitions | Application deadlines | High |
| Faculty Expertise | Professors in domain | Office hours, email | Medium |
| Labs/Equipment | Relevant facilities | Course enrollment | Medium |
| Student Talent | CS, Design, Business | Student orgs, classes | High |

Fill in with specific resources relevant to this startup.

## Key Contacts to Make

### Entrepreneurship Director
- Why: Access to resources, mentorship
- How to connect: Email, office hours
- Ask: Incubator application, introductions

### Faculty Advisor
- Why: Domain expertise, credibility
- How to connect: Course enrollment, research
- Ask: Feedback, introductions

### Student Org Leaders
- Why: Access to talent, early users
- How to connect: Events, LinkedIn
- Ask: Speaking opportunities, partnerships

## Competition & Grant Roadmap

| Opportunity | Award | Deadline | Prep Required |
|-------------|-------|----------|---------------|
| [Competition 1] | $5K | Spring | Pitch deck |
| [Competition 2] | $10K | Fall | Business plan |
| [Grant 1] | $2K | Rolling | Application |

List 4-5 relevant opportunities.

## Campus as Testing Ground
- Pilot opportunities on campus
- Student segments to target first
- Feedback collection methods
${outputRules}`,
    },
    {
      key: "fundingPitch",
      title: "Funding & Pitch Strategy",
      prompt: `Analyze this startup idea and generate FUNDING & PITCH content.

${ideaContext}

Generate the following sections in clean markdown format:

## One-Page Pitch Summary

**THE PROBLEM**
[2-3 sentences describing the problem]

**THE SOLUTION**
[2-3 sentences describing your solution]

**MARKET OPPORTUNITY**
- TAM: $X billion
- SAM: $X million
- SOM: $X million (Year 1 target)

**BUSINESS MODEL**
[How you make money - pricing, revenue streams]

**TRACTION TARGETS**
[Key metrics to hit before fundraising]

**THE ASK**
[Amount seeking and use of funds]

## Grant & Competition List

| Name | Amount | Deadline | Fit |
|------|--------|----------|-----|
| [Grant/Competition 1] | $5,000 | March | High |
| [Grant/Competition 2] | $10,000 | June | High |
| [Grant/Competition 3] | $2,500 | Rolling | Medium |
| [Grant/Competition 4] | $25,000 | September | High |

List 4-6 relevant opportunities with real names if possible.

## Funding Roadmap

| Stage | Amount | Timeline | Milestones First |
|-------|--------|----------|------------------|
| Pre-seed | $50-100K | Month 6 | MVP, 100 users |
| Seed | $500K-1M | Month 18 | PMF, 10K users |
| Series A | $3-5M | Month 36 | $1M ARR |

Customize based on the specific startup.
${outputRules}`,
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
          maxOutputTokens: 8192,
          temperature: 0.7,
          thinkingConfig: {
            thinkingBudget: 0,
          },
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
      maxOutputTokens: 4096,
      temperature: 0.7,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  });

  return response.text || "## Executive Summary\n\nGeneration pending...";
}
