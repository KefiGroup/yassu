import OpenAI from "openai";

// Create AI client using OpenAI API
function getAIClient(): OpenAI {
  // Use Replit AI Integrations if available, otherwise fall back to standard OpenAI
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  
  console.log('[AI Client] Initializing with baseURL:', baseURL);
  console.log('[AI Client] API key present:', !!apiKey);
  
  if (!apiKey) {
    throw new Error("No OpenAI API key found. Please set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY environment variable.");
  }
  
  return new OpenAI({
    apiKey,
    baseURL,
  });
}

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

  const officialSkills = [
    "Django", "Express.js", "FastAPI", "GraphQL", "Microservices", "Node.js", "REST APIs", "Spring Boot",
    "Business Development", "Content Marketing", "Copywriting", "Growth Hacking", "Marketing", "Product Management", "Project Management", "Public Relations", "Sales", "SEO/SEM", "Social Media Marketing",
    "AWS", "Azure", "CI/CD", "DevOps", "Docker", "Google Cloud", "Kubernetes", "Linux",
    "Computer Vision", "Data Analysis", "Data Science", "Deep Learning", "LLMs/GenAI", "Machine Learning", "NLP", "PyTorch", "TensorFlow",
    "Firebase", "MongoDB", "MySQL", "PostgreSQL", "Redis", "Supabase",
    "Brand Design", "Figma", "Graphic Design", "Motion Design", "Product Design", "Prototyping", "UI/UX Design", "User Research",
    "3D Printing", "AR/VR", "Blockchain", "Cybersecurity", "Hardware", "IoT", "Robotics", "Smart Contracts", "Web3",
    "Accounting", "Financial Modeling", "Fundraising", "Investor Relations", "Legal", "Operations", "Supply Chain",
    "Angular", "Flutter", "HTML/CSS", "Next.js", "React", "React Native", "Svelte", "Tailwind CSS", "Vue.js",
    "Agile/Scrum", "Negotiation", "People Management", "Public Speaking", "Strategic Planning", "Team Leadership",
    "C#", "C++", "Go", "Java", "JavaScript", "Kotlin", "MATLAB", "PHP", "Python", "R", "Ruby", "Rust", "SQL", "Swift", "TypeScript"
  ].join(", ");

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

## Figma Design Prompt

Generate a detailed design brief for creating the MVP in Figma:

**Design System:**
- Color palette: [Primary, Secondary, Accent colors with hex codes]
- Typography: [Font families for headings, body, buttons]
- Component library needs: [Buttons, forms, cards, etc.]

**Key Screens to Design:**
1. [Screen 1 name] - Purpose, key elements, user actions
2. [Screen 2 name] - Purpose, key elements, user actions
3. [Screen 3 name] - Purpose, key elements, user actions

**User Flow Diagram:**
[Describe the main user journey from entry to key action]

**Design Priorities:**
- Mobile-first or desktop-first?
- Accessibility requirements
- Brand personality (e.g., professional, playful, minimal)
${outputRules}`,
    },
    {
      key: "teamTalent",
      title: "Team & Talent Strategy",
      prompt: `Analyze this startup idea and generate TEAM & TALENT content.

${ideaContext}

IMPORTANT: For the Skill Matrix and Required Skills, you MUST use skills from this exact list (pick the most relevant 6-8 skills):

OFFICIAL SKILLS LIST:
${officialSkills}

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

## Personality & Working Style Preferences

For optimal team matching, define the ideal co-founder/team member traits:

**Work Style:**
- Pace: Fast-moving / Methodical / Balanced
- Decision-making: Data-driven / Intuition-based / Collaborative
- Communication: Frequent check-ins / Async updates / Weekly syncs

**Personality Traits (Rank top 3):**
- [ ] Ambitious & competitive
- [ ] Detail-oriented & thorough
- [ ] Creative & innovative
- [ ] Analytical & logical
- [ ] Empathetic & people-focused
- [ ] Resilient & adaptable

**Cultural Fit:**
- Work hours expectations (flexible / structured)
- Equity vs. salary preferences
- Long-term commitment level

## Suggested Invite List

Based on the required skills and personality profile, here are the types of people to invite:

### Priority 1: Technical Co-Founder
- **Profile**: [Specific major, year, background]
- **Skills needed**: [List exact skills from the skill matrix]
- **Where to find**: [Specific clubs, classes, events]
- **Matching criteria**: [Personality traits, availability, interests]

### Priority 2: Business/Growth Lead
- **Profile**: [Specific major, year, background]
- **Skills needed**: [List exact skills from the skill matrix]
- **Where to find**: [Specific clubs, classes, events]
- **Matching criteria**: [Personality traits, availability, interests]

### Priority 3: Designer/Product Person
- **Profile**: [Specific major, year, background]
- **Skills needed**: [List exact skills from the skill matrix]
- **Where to find**: [Specific clubs, classes, events]
- **Matching criteria**: [Personality traits, availability, interests]
${outputRules}`,
    },
    {
      key: "launchPlan",
      title: "Launch & Growth Plan",
      prompt: `Analyze this startup idea and generate LAUNCH & GROWTH content.

${ideaContext}

Generate the following sections in clean markdown format:

## Pre-Launch Checklist
- Beta user recruitment strategy
- Landing page essentials
- Analytics setup
- Legal/compliance basics

## Go-To-Market Strategy
- Primary acquisition channel
- Secondary acquisition channel
- Referral/viral loops
- Content strategy

## 12-Month Growth Roadmap

| Month | Focus | Key Metric | Target |
|-------|-------|------------|--------|
| 1-3 | Beta / MVP | Active Users | [Number] |
| 4-6 | Retention | Churn Rate | <[X]% |
| 7-9 | Monetization | Revenue | $[Amount] |
| 10-12 | Scaling | Growth Rate | [X]% MoM |

## Marketing Asset Briefs
- Social media ad copy (3 variations)
- Email sequence (Subject lines for 3 emails)
- One-sentence pitch for different platforms
${outputRules}`,
    },
    {
      key: "schoolAdvantage",
      title: "University Advantage",
      prompt: `Analyze this startup idea and generate UNIVERSITY ADVANTAGE content.

${ideaContext}

Generate the following sections in clean markdown format:

## Campus Resources
- Relevant labs/research centers
- Specific professors/mentors to approach
- University-specific grants/funding
- Incubators/accelerators on campus

## Student Network Wedge
- Ideal student clubs for early adopters
- Campus events for launch
- How to leverage alumni network
- Student-specific distribution channels

## Academic Integration
- Relevant courses for project credit
- Potential research collaboration
- Internship/hiring pipeline from specific majors
${outputRules}`,
    },
    {
      key: "fundingPitch",
      title: "Funding & Pitch Deck",
      prompt: `Analyze this startup idea and generate FUNDING & PITCH content.

${ideaContext}

Generate the following sections in clean markdown format:

## Pitch Deck Outline
1. Title & Hook
2. Problem (The Pain)
3. Solution (The Gain)
4. Market Opportunity
5. Product/MVP
6. Traction/Milestones
7. Team (Why us?)
8. The Ask (Funding/Resources)

## Financial Projections (Year 1-3)
- Revenue model (SaaS, Transactional, etc.)
- Key cost drivers
- Break-even analysis
- Funding requirements

## Investor Outreach Strategy
- Ideal investor profile
- Target VC firms/Angel groups
- Pitching timeline

## Outreach Templates

### Cold Outreach Email
Subject: [Product Name] - Solving [Problem] for [Target Users]

Hi [Investor Name],

I'm [Founder Name], building [Product Name] at [University]. We help [target users] [solve problem] by [solution approach].

Our solution: [2 sentences on your approach]

We've [traction metric] and are raising [amount] to [key milestone].

Would you be open to a 15-minute call next week?

Best,
[Your name]
[LinkedIn]

### Warm Intro Request Template

Hi [Connector],

Hope you're doing well! I'm reaching out because I'm raising [amount] for [company name], and I noticed you're connected to [Investor Name] on LinkedIn.

Quick context:
- [One-line description]
- [Key traction metric]
- [Why this investor is a fit]

Would you be comfortable making an intro? Happy to send a forwardable email.

Thanks!
[Your name]

### Forwardable Intro Email

[Connector name], thanks for offering to intro me to [Investor]!

Here's a forwardable blurb:

---

[Investor name],

I'd like to introduce you to [Founder name], a [year] at [University] who's building [product name].

[Product name] helps [target users] [solve problem] by [solution approach]. They've [traction metric] and are raising [amount].

I think this could be interesting for [reason related to investor's thesis].

[Founder], meet [Investor].
${outputRules}`,
    },
  ];
}

export async function generateBusinessPlan(idea: IdeaInput): Promise<BusinessPlanSections> {
  const sectionPrompts = buildSectionPrompts(idea);
  
  console.log(`[AI] Starting sequential generation of ${sectionPrompts.length} sections`);
  
  const results: { key: string; content: string }[] = [];
  
  for (let index = 0; index < sectionPrompts.length; index++) {
    const section = sectionPrompts[index];
    console.log(`[AI] Generating section ${index + 1}/${sectionPrompts.length}: ${section.title}`);
    
    try {
      const client = getAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: section.prompt }],
        max_completion_tokens: 8192,
      });
      
      const content = response.choices[0]?.message?.content || `## ${section.title}\n\nGeneration failed. Please try again.`;
      console.log(`[AI] Completed section: ${section.title} (${content.length} chars)`);
      
      results.push({ key: section.key, content });
    } catch (error) {
      console.error(`[AI] Error generating section ${section.title}:`, error);
      results.push({ key: section.key, content: `## ${section.title}\n\nGeneration failed. Please try again.` });
    }
  }
  
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

  const prompt = `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

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

Keep it to ~400 words. Make it compelling enough to hook an investor or co-founder.`;

  const client = getAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 8192,
  });

  return response.choices[0]?.message?.content || "## Executive Summary\n\nGeneration pending...";
}
