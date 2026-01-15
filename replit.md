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
- **Idea Management**: Users can post, update, and manage startup ideas, tracking their progress through a 7-step journey (Post Idea, Business Plan, Find Advisors, Form Team, Build MVP, Yassu Foundry, Launch). Ideas can be toggled between public and private visibility.
- **AI Business Analysis**: AI-powered workflows generate and refine multi-section business plans, with inline editing capabilities for founders. Business plans are auto-populated and editable via markdown.
- **Team Formation & Collaboration**: Features for finding co-founders, advisors, and ambassadors based on skills and interests. Includes a connection system (like LinkedIn) for users to build their network, send team invitations, and manage join requests.
- **Collaborator Marketplace**: A dedicated section to discover and filter platform users by roles, skills, interests, clubs, and universities, with clickable profiles.
- **Admin Dashboard**: A unified interface for administrators to manage badges (Ambassador, Advisor), view all ideas (including private ones), and grant/revoke admin privileges.
- **Direct Messaging**: Full messaging system with conversation threads, real-time UI, and email notifications for new messages.
- **Notification System**: Email notifications for connection requests, team invitations, new messages, and weekly digests.
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
- **UI/UX**: Utilizes Tailwind CSS and shadcn/ui for a modern, responsive design. The dashboard is redesigned into focused sections: My Ideas, Team Join Requests, and People to Invite.

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Google Gemini 2.5 Flash**: AI model used for generating business plans.
- **Resend**: Email service for sending notifications.
- **connect-pg-simple**: PostgreSQL session store for Express.js.
- **driver.js**: (Presumed for guided tours or feature introductions based on recent additions).
- **dotenv**: For managing environment variables.