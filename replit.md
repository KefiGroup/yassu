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
