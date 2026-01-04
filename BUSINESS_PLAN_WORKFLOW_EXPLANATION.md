# Business Plan Workflow - Complete Explanation

## Current System Architecture

### The Complete Flow

1. **AI Idea Wizard** (`/portal/ideas/new`)
   - User enters raw idea
   - AI analyzes and asks clarifying questions (optional)
   - AI generates refined idea with:
     - Title
     - Problem Statement
     - Proposed Solution
     - Target Users
     - Why Now?
     - Key Assumptions
     - Suggested Tags
   - User clicks "Save Idea" → Idea is created in database
   - User clicks "Generate Business Plan" → Triggers workflow

2. **Business Plan Generation Workflow** (`/api/workflows/run`)
   - Endpoint: `POST /api/workflows/run`
   - Workflow Type: `business_plan`
   - Calls `generateBusinessPlan()` function in `/server/ai.ts`
   - Generates **9 sections** in parallel:
     1. **Executive Summary** (generated last, summarizes all sections)
     2. **Founder Fit** - Why you're the right person to build this
     3. **Competitive Landscape** - Market analysis and competitors
     4. **Risk & Moat** - Risks and competitive advantages
     5. **MVP Design** - Minimum viable product strategy
     6. **Team & Talent** - Team needs and hiring strategy
     7. **Launch Plan** - Go-to-market strategy
     8. **School Advantage** - University-specific advantages
     9. **Funding Pitch** - Investment ask and use of funds

3. **Workflow Sections Storage**
   - After generation completes, sections are auto-populated into `idea_workflow_sections` table
   - Each section is stored separately with:
     - `ideaId`: Links to the idea
     - `sectionType`: One of the 9 types above
     - `content`: Markdown content
     - `aiGenerated`: true (indicates AI-generated content)
   - User can then edit each section individually

4. **Editing Workflow Sections** (`/portal/ideas/:id`)
   - User views the idea detail page
   - Business plan sections are displayed
   - Click "Edit" on any section to modify
   - Changes are saved to `idea_workflow_sections` table

## The 9 Business Plan Sections

### Section Mapping

| AI Output Key | Database Section Type | Display Title |
|--------------|----------------------|---------------|
| `executiveSummary` | `executive_summary` | Executive Summary |
| `founderFit` | `founder_fit` | Founder Fit |
| `competitiveLandscape` | `competitive_landscape` | Competitive Landscape |
| `riskMoat` | `risk_and_moat` | Risk & Moat |
| `mvpDesign` | `mvp_design` | MVP Design |
| `teamTalent` | `team_and_talent` | Team & Talent |
| `launchPlan` | `launch_plan` | Launch Plan |
| `schoolAdvantage` | `school_advantage` | School Advantage |
| `fundingPitch` | `funding_pitch` | Funding Pitch |

## Current Status

### ✅ What's Working

1. **AI Idea Wizard** - Generates refined ideas successfully
2. **Save Idea** - Creates ideas in database
3. **Business Plan Generation** - The `generateBusinessPlan()` function exists and works
4. **Workflow Sections Storage** - Auto-populates sections after generation
5. **Section Editing** - Users can edit individual sections

### ❓ What You Asked About

**"The business plan is not generating according to the 8 workflows"**

The system is designed to:
1. First save the basic idea (from AI Wizard)
2. Then user clicks "Generate Business Plan" button
3. This triggers the workflow that generates all 9 sections

If you're not seeing the 9 sections, it's because:
- You need to click the "Generate Business Plan" button after saving the idea
- The button is on the idea detail page (`/portal/ideas/:id`)
- It takes 1-2 minutes to generate all sections

### Testing the Complete Flow

1. Go to `/portal/ideas/new`
2. Enter an idea and let AI refine it
3. Click "Save Idea"
4. You'll be redirected to the idea detail page
5. Click "Generate Business Plan" button
6. Wait 1-2 minutes for generation
7. All 9 sections will appear
8. Click "Edit" on any section to modify it

## Files Involved

- `/server/ai.ts` - Business plan generation logic
- `/server/routes.ts` - Workflow API endpoints (line 656+)
- `/server/ai-wizard.ts` - AI Idea Wizard logic
- `/src/pages/portal/IdeaWizard.tsx` - AI Wizard UI
- `/src/pages/portal/IdeaDetail.tsx` - Idea detail page with "Generate Business Plan" button
- `/shared/schema.ts` - Database schema for workflow sections (line 278)

## Next Steps

If you want the AI Idea Wizard to automatically generate the full business plan (all 9 sections) without requiring a separate button click, I can modify the workflow to:

1. Save the idea
2. Automatically trigger business plan generation
3. Show a loading state while generating
4. Display all 9 sections when complete

Would you like me to implement this automatic generation?
