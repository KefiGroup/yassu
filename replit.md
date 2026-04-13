# Yassu - University Founders Platform

## Overview
Yassu is a platform designed to foster entrepreneurship among university students by enabling them to post startup ideas, find co-founders, leverage AI-powered business analysis, and build collaborative teams. It aims to be a comprehensive ecosystem supporting student founders from idea inception through team formation and business plan development, with ambitions to expand into a broader university innovation network.

## User Preferences
- TypeScript strict mode
- Drizzle ORM for database operations
- Session-based authentication with express-session
- TanStack Query for frontend data fetching

## System Architecture
The platform employs a full-stack architecture featuring a React frontend (TypeScript, Vite, Tailwind CSS, shadcn/ui), an Express.js backend, and a PostgreSQL database managed by Drizzle ORM. TanStack Query handles frontend state management.

**UI/UX Decisions:**
- Modern, responsive design using Tailwind CSS and shadcn/ui.
- Dashboard redesigned into focused sections: My Applications, My Ideas, Team Join Requests, and People to Invite.
- White-label skin system for URL-based branding. `/bruin` and `/bruin/apply/:slug` routes show Bruin-branded content but with Yassu's main header/nav/footer (Navbar and Footer always use `YASSU_BRAND` directly). Post-submission redirects and all email links point to main Yassu URLs (no `/bruin/` prefix). `BRANDED_SLUGS` in `server/email.ts` is empty; `getBrandByPath` in `src/lib/branding.ts` still returns Bruin brand config for content components on `/bruin` paths. The `basename` in App.tsx is always empty string; `/bruin` and `/bruin/apply/:slug` are explicit routes.

**Technical Implementations & Feature Specifications:**
- **User & Profile Management**: Comprehensive profiles, university affiliation, skills, interests, and profile completion prompts.
- **Idea Management**: Users can post, update, and manage startup ideas through a 7-step journey. Ideas can be public/private and are AI-classified into industries.
- **AI Business Analysis**: AI generates and refines multi-section business plans with inline editing.
- **Team Formation & Collaboration**: Features for finding co-founders, advisors, and ambassadors, including a connection system and team invitation management.
- **Collaborator Marketplace**: Discover and filter users by roles, skills, interests, clubs, and universities.
- **Admin Dashboard**: Manages badges, ideas, user privileges, and announcements. Includes an Analytics Dashboard with KPIs, growth trends, idea pipeline, and user breakdowns, with drill-down capabilities. Also includes an **Email Log** tab tracking all outbound transactional emails (recipient, subject, auto-classified type, sent/failed status, timestamp) with search, type/status filters, pagination, and a **View Email** button that renders the full HTML email in a preview modal. Email logging (including HTML body) is handled via `email_logs` table, populated automatically by the central `sendEmail()` function in `server/email.ts`.
- **Admin Inbox**: Manages user feedback and support conversations, with email replies via Resend and screenshot attachment support.
- **Platform Announcements**: Admins can create scheduled, prioritized announcements with different types, displayed as a banner and in the notification dropdown.
- **Direct Messaging**: Full messaging system with real-time UI, conversation threads, and delayed email notifications.
- **Notification System**: Email notifications for key platform interactions.
- **Session Security & Auto-Logout**: Automated session management with "remember me" functionality, inactivity timeouts, and warning pop-ups before logout. React Error Boundary wraps the entire app to prevent white-screen crashes. `requireAdmin` middleware enforces `isSuperadmin` check. API error responses are sanitized to not leak internal details. Route params validated with NaN guards.
- **Journey Progress Tracker**: Visual progress tracker for idea development stages, allowing non-linear completion of milestones.
- **Investor Pitch Deck Generator**: AI-powered one-click generator for investor-grade pitch decks, with business plan analysis, multiple deck types, refinement features, metrics validation, and version history.
- **Pitch Preparation Module**: AI-powered module for investor pitch preparation, including spoken scripts, investor objection generation, Q&A playbooks, and practice mode.
- **Kefi AI Help Assistant**: Floating chat bubble assistant providing comprehensive help content, natural language Q&A, and contextual search.
- **Social Sharing & Invite System**: Enables sharing of the platform and specific ideas across various social media and communication channels.
- **Group Management System**: Database-backed groups with admin panels, configurable application questionnaires (including file uploads), member role management (owner, admin, judge, member), idea rating system, invite system, and ownership transfer. Groups are integrated into the main platform sidebar and can be branded. Ideas can be linked to specific groups. Post-submission settings allow admins to configure a redirect URL, custom confirmation message, and a file/image to display on the submission page. Group invite emails and account creation emails use branded URLs via `getBrandedUrl()` helper. Users see their group application status (pending/approved/rejected/draft) on the dashboard via `GET /api/my-group-applications`. Applications include a **Project Title** field and a **Team Member Invite** section (email chips). Team members listed in submitted applications are auto-attached to the group when they create accounts. Draft applications are visible to group admins with approve/reject actions. CSV export available for all applications. **Email notifications**: applicant confirmation, group admin notification, super admin notification (deduplicated against group admin emails), team member invitation emails, and 12-hour reminder for incomplete applications (background job in `server/background-jobs.ts`). `reminder_sent` column on `group_applications` prevents duplicate reminders. **My Groups page** (`/portal/groups`): Sidebar link in Main section for all users; shows group memberships with roles, application statuses with view/continue links, and a "Discover Groups" section listing groups the user can apply to (filtered to exclude already-member or active-application groups; rejected applications allow re-apply). Admin/owner/judge memberships show a "Manage" button linking directly to the correct group in Group Admin (`?group=slug` param).

## External Dependencies
- **PostgreSQL**: Primary database.
- **Google Gemini 2.5 Flash**: AI model for business analysis and content generation.
- **Resend**: Email service for notifications and invitations.
- **connect-pg-simple**: PostgreSQL session store.
- **dotenv**: Environment variable management.
- **Google Analytics**: For tracking user behavior (via gtag.js).