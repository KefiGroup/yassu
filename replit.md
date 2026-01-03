# Yassu - University Founders Platform

## Overview
Yassu is a platform for university students to post startup ideas, find co-founders, run AI-powered business analysis workflows, and build teams. The platform was migrated from Lovable/Supabase to Replit's full-stack environment with PostgreSQL, Express backend, and Drizzle ORM.

## Project Architecture

### Tech Stack
- **Frontend**: React with TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with session-based authentication
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: TanStack Query for data fetching

### Directory Structure
```
├── client/src/           # Frontend React application
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React contexts (Auth)
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities and API helpers
│   ├── pages/            # Page components
│   │   ├── portal/       # Authenticated portal pages
│   │   └── ...          # Public pages
│   └── App.tsx          # Main app router
├── server/              # Backend Express application
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Database storage layer
│   └── vite.ts          # Vite dev server integration
├── shared/              # Shared code between client/server
│   └── schema.ts        # Drizzle ORM schema definitions
└── supabase/functions/  # Legacy Supabase Edge Functions (deprecated)
```

## Database Schema

The database includes 20+ tables covering:
- **Users & Auth**: users, profiles, user_roles
- **Ideas**: ideas with problem/solution/stage tracking
- **Teams**: teams, team_members, team_applications
- **Projects**: projects and project_members
- **Workflows**: workflow_runs, workflow_step_results (AI business analysis)
- **Universities**: universities and university_resources
- **Notifications**: notification system

### Key Tables
- `users` - Authentication with email/password (bcrypt hashed)
- `profiles` - User profiles with skills, interests, university affiliation
- `ideas` - Startup ideas with stages (concept, validating, building, launched)
- `teams` - Teams formed around ideas
- `workflow_runs` - AI-powered business analysis workflows

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/me` - Get current user

### Profile
- `GET /api/profile` - Get current user profile
- `PATCH /api/profile` - Update profile
- `POST /api/profiles/match-skills` - Find profiles matching given skills (for team building)

### Ideas
- `GET /api/ideas` - List all public ideas
- `GET /api/ideas/:id` - Get single idea
- `POST /api/ideas` - Create new idea
- `PATCH /api/ideas/:id` - Update idea
- `DELETE /api/ideas/:id` - Delete idea

### Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team

### Workflows
- `GET /api/workflows` - List workflow runs
- `GET /api/workflows/:id` - Get workflow details
- `POST /api/workflows/run` - Run new workflow

### Universities
- `GET /api/universities` - List universities

### Functions (Migrated Edge Functions)
- `POST /api/functions/import-linkedin` - Import profile from LinkedIn

## Running the Project

```bash
npm run dev      # Start development server
npm run db:push  # Push database schema changes
```

## Recent Changes

### January 2026 - Journey Progress Tracker & Branding
- Added 7-step journey progress tracker to each idea detail page showing:
  1. Post Idea (completed when idea exists)
  2. Business Plan (current/completed based on plan status)
  3. Find Mentors (next step after plan generation)
  4. Form Team
  5. Build MVP
  6. Yassu Foundry
  7. Launch
- Rebranded "AI Business Plan" to "Yassu Business Plan" across all pages
- Updated description: "Yassu AI will analyze your idea and generate a comprehensive business plan covering 8 key areas in about 2 minutes."

### January 2026 - How Yassu Works Section
- Updated "How Yassu Works" section with 7-step journey:
  1. Post an Idea (Yassu!)
  2. Generate Business Plan with Yassu Agent
  3. Find Advisors & Ambassadors
  4. Form Your Yassu Team
  5. Work on MVP
  6. Present in Yassu Foundry
  7. Seek Funding / Market Launch

### January 2026 - Yassu Advisors & Ambassadors
- Added `yassuRole` field to profiles schema (ambassador, advisor, or null)
- Ambassadors are undergrad students who represent Yassu on campus
- Advisors are graduated professionals who mentor student founders
- New public pages: `/advisors` and `/ambassadors` to showcase members
- Profile page includes Yassu role selection dropdown
- API endpoints: `GET /api/advisors` and `GET /api/ambassadors`

### January 2026 - Team Matching Feature
- AI outputs required skills between `<!-- SKILLS_JSON_START/END -->` markers in Team & Talent section
- Backend `/api/profiles/match-skills` endpoint finds profiles with overlapping skills
- IdeaDetail.tsx extracts skills with markdown stripping (bold, italic, backticks, links, parentheses)
- Validates extracted skills against platform taxonomy (SKILL_OPTIONS from profileOptions.ts)
- Displays top 10 potential co-founders sorted by skill match count

### January 2026 - AI Business Plan Generation
- Migrated from OpenAI GPT-4o to Google Gemini 2.5 Flash with parallel batch processing (8 sections, 4 concurrent)
- Created server/ai.ts with generateBusinessPlan function
- Business plans include 9 sections: Executive Summary, Founder Fit, Competitive Landscape, Risk & Moat, MVP Design, Team & Talent, Launch Plan, School Advantage, Funding Pitch
- IdeaDetail page now uses Express API and includes tabbed business plan viewer
- Added Word document download functionality for business plans
- Added Settings page with notification preferences and account management

### January 2026 - Supabase to Replit Migration
- Migrated from Supabase Auth to session-based Express authentication
- Converted Supabase client calls to REST API endpoints
- Updated schema from snake_case to camelCase for TypeScript consistency
- Seeded 20 major universities
- Fixed Express 5 wildcard route syntax (`/{*splat}` instead of `*`)

## User Preferences
- TypeScript strict mode
- Drizzle ORM for database operations
- Session-based authentication with express-session
- TanStack Query for frontend data fetching

## Notes
- Express 5 requires `/{*splat}` syntax for wildcard routes
- Database uses PostgreSQL with Drizzle ORM
- Session stored in PostgreSQL via connect-pg-simple
- Frontend runs on port 5000 for Replit webview compatibility
