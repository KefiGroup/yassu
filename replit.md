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
- **Notification System**: Email notifications for connection requests and weekly digests.
- **Journey Progress Tracker**: Visual progress tracker for each idea's development stages.
- **UI/UX**: Utilizes Tailwind CSS and shadcn/ui for a modern, responsive design. The dashboard is redesigned into focused sections: My Ideas, Team Join Requests, and People to Invite.

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Google Gemini 2.5 Flash**: AI model used for generating business plans.
- **Resend**: Email service for sending notifications.
- **connect-pg-simple**: PostgreSQL session store for Express.js.
- **driver.js**: (Presumed for guided tours or feature introductions based on recent additions).
- **dotenv**: For managing environment variables.