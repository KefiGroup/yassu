# Yassu - University Founders Platform

## Overview
Yassu is a platform designed for university students to foster entrepreneurship. It enables users to post startup ideas, find co-founders, leverage AI-powered business analysis, and build collaborative teams. The platform aims to be a comprehensive ecosystem for student founders, supporting them from idea inception through team formation and business plan development, with ambitions to expand into a broader university innovation network.

## User Preferences
- TypeScript strict mode
- Drizzle ORM for database operations
- Session-based authentication with express-session
- TanStack Query for frontend data fetching

## System Architecture
The platform utilizes a full-stack architecture with React (TypeScript, Vite, Tailwind CSS, shadcn/ui) for the frontend, an Express.js backend, and a PostgreSQL database managed by Drizzle ORM. Frontend state management is handled by TanStack Query.

**Key Features:**
- **User & Profile Management**: Comprehensive user profiles with skills, interests, university affiliation, and club types. Includes a profile completion prompt for new users.
- **Idea Management**: Users can post, update, and manage startup ideas, tracking their progress through a 7-step journey (Post Idea, Business Plan, Find Advisors, Form Team, Build MVP, Yassu Foundry, Launch). Ideas can be toggled between public and private visibility. AI automatically classifies ideas into 1-3 industries from a predefined list of 15 industries (Technology & Software, Healthcare & Biotech, Finance & Fintech, etc.). The Ideas Marketplace groups ideas by industry with an industry filter dropdown. Industries are stored via a many-to-many relationship (industries + idea_industries tables).
- **AI Business Analysis**: AI-powered workflows generate and refine multi-section business plans, with inline editing capabilities for founders. Business plans are auto-populated and editable via markdown.
- **Team Formation & Collaboration**: Features for finding co-founders, advisors, and ambassadors based on skills and interests. Includes a connection system (like LinkedIn) for users to build their network, send team invitations, and manage join requests.
- **Collaborator Marketplace**: A dedicated section to discover and filter platform users by roles, skills, interests, clubs, and universities, with clickable profiles.
- **Admin Dashboard**: A unified interface for administrators to manage badges (Ambassador, Advisor), view all ideas (including private ones), grant/revoke admin privileges, and create platform announcements. Includes a comprehensive **Analytics Dashboard** (first tab) with:
  - KPI cards: Total Users, Ideas, Teams, Business Plans, Pitch Decks, Connections, Messages, Join Requests
  - Growth trends chart (12-week area chart for users, ideas, teams)
  - Idea Pipeline Funnel (horizontal bar by stage)
  - Brand Breakdown pie chart (Yassu vs Bruin)
  - Top Universities and User Roles breakdowns
  - Recent Signups, Ideas, and Teams lists
  - Every chart/card is clickable for drill-down into a detailed data table modal
  - Uses Recharts for charting; data served via `GET /api/admin/analytics` and `GET /api/admin/analytics/drilldown`
- **Admin Inbox**: Built-in inbox system for managing user feedback and support conversations. Features include:
  - Conversation list with unread message badges
  - Reply functionality that sends emails to users via Resend
  - Mark conversations as resolved/reopened
  - Full message thread history for each conversation
  - Loading states to prevent stale data display
  - Screenshot attachment support - users can attach screenshots when submitting feedback via Kefi chat
- **Platform Announcements**: System for admins to communicate with all users. Features include:
  - Four announcement types: Maintenance, Event, Update, General
  - Three priority levels: Normal, Important, Urgent
  - Scheduled start and end dates for time-limited announcements
  - Banner bar at top of portal for active announcements (dismissible for non-urgent)
  - Integration with notification dropdown showing all active announcements
  - Full CRUD management in Admin panel
- **Direct Messaging**: Full messaging system with conversation threads, real-time UI, and email notifications for new messages. Features include:
  - Unread message count badge in sidebar (refreshes every 30 seconds)
  - Red dot indicator when sidebar is collapsed
  - Delayed email notifications for unread messages after 10 minutes
  - Respects user's notification preferences (messageNotificationsEnabled)
- **Notification System**: Email notifications for connection requests, team invitations, new messages, and weekly digests.
- **Session Security & Auto-Logout**: Automatic session management for user security. Features include:
  - "Remember me for 30 days" checkbox on login for extended sessions
  - 1-hour inactivity timeout for regular sessions (not "remember me")
  - Warning popup 3 minutes before automatic logout with countdown timer
  - "Stay Logged In" button to extend session
  - Security message displayed on login page after inactivity logout
  - Activity tracking via mouse, keyboard, touch, and scroll events
- **Journey Progress Tracker**: Visual progress tracker for each idea's development stages with independent milestone completion. Each step (Post Idea, Business Plan, Find Advisors, Form Team, Build MVP, Yassu Foundry, Seek Funding) can be completed in any order without sequential dependencies. Features dashed connecting lines to indicate non-linear paths and ring-style in-progress indicators.
- **Investor Pitch Deck Generator**: AI-powered one-click generator for creating investor-grade pitch decks. Features include:
  - Auto-analysis of business plan to determine investor type (Angel vs VC) and raise amount
  - Clean centered UI matching the MVP Builder design pattern
  - Business Plan preview card showing loaded sections
  - Optional upload of refined business plan
  - AI automatically extracts problem, solution, traction, and founder context
  - Full 10-slide deck or 6-slide Warm Intro generation
  - "Investor-Proof This Deck" refinement feature for tightening language
  - Metrics validation table showing required metrics per slide
  - Manus-ready export with copy-paste format for slide design
  - Version history tracking with restore capability
- **Pitch Preparation Module**: AI-powered investor pitch preparation to help founders deliver confidently and handle Q&A. Features include:
  - Spoken delivery script for each slide (what to say out loud, key emphasis, delivery tips)
  - Investor objection generator with 10 categories (Problem, Solution, Market, Traction, Business Model, GTM, Competition, Team, Timing, Risk)
  - Risk-level classification (High/Medium/Low) with color-coded badges
  - Live Q&A response playbook with best answers and "what NOT to say"
  - Deal-breaker awareness and mitigation strategies
  - Rapid-fire rehearsal drill with 10-12 practice questions
  - Practice Mode toggle to hide answers for self-testing
  - One-click export of full preparation playbook
- **Kefi AI Help Assistant**: AI-powered help assistant accessible via floating chat bubble in the portal. Features include:
  - Comprehensive help content covering all platform features
  - Natural language Q&A about posting ideas, business plans, pitch decks, team building, etc.
  - Contextual search that finds relevant help topics based on user questions
  - Conversation history within each chat session
  - Friendly, encouraging personality tailored for student founders
- **Social Sharing & Invite System**: Enables users to share Yassu with friends and associates across platforms. Features include:
  - ShareInviteModal component (`src/components/portal/ShareInviteModal.tsx`) with Web Share API (native OS sharing), X/Twitter, LinkedIn, WhatsApp, email, and copy-to-clipboard
  - "Invite Friends" button in portal sidebar footer (works collapsed and expanded)
  - "Spread the Word" card on dashboard with invite CTA
  - Idea-specific sharing via share icon on idea detail page titles
  - Brand-aware: uses `brand.canonicalUrl` and `brand.name` for correct Yassu vs Bruin sharing
  - Customizable share text for general invites vs idea-specific sharing
- **Group Management System**: Database-backed groups with admin panels for branded communities (e.g., Bruin Entrepreneurs). Features include:
  - Database tables: `groups`, `group_members` (owner/admin/member roles), `group_invites` (pending/accepted/expired)
  - **Group Admin Panel** (`src/pages/portal/GroupAdmin.tsx`): Tabs for Overview (stats), Members (role management, search, remove), Ideas (group-specific), Invites (single + CSV bulk upload)
  - **Super Admin Group Creation**: "Groups" tab in Admin panel to create new groups with name, slug, colors, and university affiliation
  - **Invite System**: Single email or bulk CSV upload, sends branded invitation emails via Resend, accept-invite page at `/accept-group-invite?token=xxx`
  - **Sidebar Integration**: "Manage Group" link appears automatically for group admins/owners
  - Group ideas are linked via the `brand` column on ideas table matching the group slug
  - Bruin Entrepreneurs seeded as first group with UCLA colors and university affiliation
- **UI/UX**: Utilizes Tailwind CSS and shadcn/ui for a modern, responsive design. The dashboard is redesigned into focused sections: My Ideas, Team Join Requests, and People to Invite.

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Google Gemini 2.5 Flash**: AI model used for generating business plans.
- **Resend**: Email service for sending notifications.
- **connect-pg-simple**: PostgreSQL session store for Express.js.
- **driver.js**: (Presumed for guided tours or feature introductions based on recent additions).
- **dotenv**: For managing environment variables.
- **Google Analytics**: Tracking via gtag.js (Measurement ID: G-T0ELVMWHE7) loaded in index.html.
- **White-Label Skin System**: URL-based branding system enabling multiple branded experiences from the same codebase. Uses React Router `basename` for automatic URL prefixing.
  - **Architecture**: `src/lib/branding.ts` defines `BrandConfig` interface and brand configs; `src/contexts/BrandingContext.tsx` provides `useBranding()` hook; `BrandingProvider` wraps the router and applies CSS variable overrides via `document.documentElement.style.setProperty()`
  - **Branding Detection**: `window.location.pathname.startsWith('/bruin')` → Bruin config, otherwise → Yassu config. `BrowserRouter basename` is set accordingly so ALL `navigate()`, `<Link>`, and `<NavLink>` calls auto-prefix without per-component changes.
  - **Active Skins**: Yassu (default, purple `250 60% 65%` / coral `15 80% 75%`), Bruin Entrepreneurs (`/bruin`, UCLA blue `213 69% 38%` / gold `45 100% 51%`)
  - **Branded Components**: Navbar, Hero, HowItWorks, Vision, Team, Footer, Auth, ForgotPassword, ResetPassword, PortalSidebar, PortalHeader (via navigate), usePageTitle, WelcomeModal, Profile (welcome alert), KefiChat (brand-neutral)
  - **Inactivity Logout**: AuthContext uses `window.location.pathname` to detect `/bruin` prefix before redirecting to `/auth?reason=inactivity`, preserving the brand path
  - **Brand-Isolated Marketplace**: Ideas are tagged with a `brand` column (null = Yassu, 'bruin' = Bruin). When logging in from `/bruin`, session stores `brand: 'bruin'`. Ideas created from Bruin are tagged `brand='bruin'` and only visible in the Bruin marketplace. Yassu marketplace shows only unbranded ideas. Admin panel sees all ideas across brands. Search, featured ideas, and IdeasSlider all respect brand filtering via `?brand=` query parameter.
  - **Adding New Skins**: Add a new `BrandConfig` to `branding.ts`, update `getBrandByPath()`, set a new basename check in `App.tsx`