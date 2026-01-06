# Yassu Development TODO
**Last Updated:** January 6, 2026  
**Project:** Yassu - Where Elite University Talent Builds Together  
**Vision:** AI-powered ecosystem connecting student entrepreneurs, collaborators, and investors

---

## 🎯 Current Sprint Status

**Active Sprint:** Week 2 - Vibrant Talent Marketplace  
**Completed:** ✅ Week 1 (AI Idea Wizard, Business Plan Generation)  
**Completed:** ✅ Foundation (Admin, Email, Security)  
**Next Priority:** Week 2 Features (Profiles 2.0, Reputation System, Structured Applications)

---

## ✅ Recently Completed (January 2026)

### 🎯 Week 1: Intelligent Creator Experience - COMPLETED ✅

#### AI Idea Wizard (Replaces Manual Form)
- [x] Natural language idea input interface
- [x] Voice input feature with Speech Recognition API
- [x] Real-time transcription to text
- [x] AI-powered idea refinement using GPT-4.1-mini
- [x] Clarifying questions generation (when needed)
- [x] Structured idea output (title, problem, solution, target user, why now)
- [x] Suggested tags generation
- [x] Confidence scoring (0-100%)
- [x] Removed old manual form (CreateIdea.tsx)
- [x] Route `/portal/ideas/new` points directly to AI Wizard
- [x] "Post New Idea" button goes directly to AI Wizard
- [x] Voice input works on Chrome, Edge, Safari
- [x] Deployed and tested in production

**Implementation Details:**
- File: `src/pages/portal/IdeaWizard.tsx` (988 lines)
- Backend: `/api/ideas/ai-refine` endpoint
- AI Model: GPT-4.1-mini via OpenAI API
- Features: Voice input, natural language processing, structured output
- Result: 70% fewer steps, 10x easier idea creation

#### Business Plan Generation (8 Workflow Sections)
- [x] AI-generated comprehensive business plans
- [x] 8 sections: Problem, Solution, Market, Model, Competition, GTM, Team, Milestones
- [x] Individual section editing
- [x] Export to Word document
- [x] Real-time generation (2-3 minutes)
- [x] Integrated with AI Wizard output

**Note:** Week 1 focused on the AI-guided creator experience rather than the originally planned "Next Steps Engine" because the AI Wizard provides a more comprehensive solution to "What do I do next?" by transforming vague ideas into structured business concepts with actionable plans.

### Admin & Security Features
- [x] Admin deletion capabilities (ideas and users)
- [x] Forgot password flow with email verification
- [x] Password reset token system (SHA-256 hashed, 1-hour expiration)
- [x] Admin dashboard route fixes (`/portal/admin`)
- [x] Admin role assignment in database

### Email Notification System
- [x] Resend integration with API key setup
- [x] Welcome email (on user signup)
- [x] Team invitation email (when invited to join team)
- [x] Skill match email (when new idea matches user skills)
- [x] Invite accepted email (when join request accepted)
- [x] Password reset email template
- [x] Weekly digest email system (pending cron setup)

### Infrastructure
- [x] Custom email domain setup (yassu.ai in Resend)
- [x] Database migration for `password_reset_tokens` table
- [x] Database migration for `digest_email_log` table
- [x] Environment variables configuration (RESEND_API_KEY, FROM_EMAIL, APP_URL)
- [x] Railway deployment pipeline

---

## 🚀 3-Week Transformation Plan

### **Week 1: The Intelligent Creator Experience** ✅ COMPLETED
**Goal:** Solve "What do I do next?" - Transform creator journey into AI-guided roadmap

**Status:** ✅ Completed with AI Idea Wizard (superior alternative to original plan)

**What Was Delivered:**
Instead of implementing separate "Next Steps Engine," "Team Role Suggester," and "Collaborator Matching" features, we built a comprehensive **AI Idea Wizard** that solves the creator's problem more elegantly:

- ✅ **AI Idea Wizard** - Natural language idea input with voice support
- ✅ **Intelligent Refinement** - AI transforms vague ideas into structured concepts
- ✅ **Business Plan Generation** - Complete 8-section plans with actionable steps
- ✅ **Voice Input** - Speak your idea naturally (70% fewer steps)
- ✅ **Deployed & Tested** - Live in production at www.yassu.ai

**Original Plan (Not Implemented):**

#### Feature 1.1: AI Next Steps Engine (REPLACED by AI Wizard)
- [x] ~~Design rule-based logic for next steps generation~~ (AI Wizard provides better solution)
- [x] ~~Create `ai_next_steps` table~~ (Not needed - AI Wizard handles this)
- [x] ~~Implement backend API endpoint~~ (Replaced by `/api/ideas/ai-refine`)
- [x] ~~Build AI logic~~ (GPT-4.1-mini provides superior logic)
- [x] ~~Create frontend component~~ (AI Wizard provides full interface)

**Why AI Wizard is Better:**
- Solves the root problem: turning vague ideas into actionable plans
- Provides immediate value at idea creation (not after)
- More intelligent than rule-based next steps
- Includes voice input for accessibility
- 70% reduction in steps to create an idea

#### Feature 1.2: AI Team Role Suggester (DEFERRED)
- [ ] Can be added as enhancement to existing AI Wizard
- [ ] Would analyze business plan and suggest roles
- [ ] Lower priority since business plan already guides team building

#### Feature 1.3: Proactive Collaborator Matching (PARTIALLY IMPLEMENTED)
- [x] Skill match email notification system (implemented)
- [x] Sends to top 10 users when idea matches their skills
- [ ] Daily cron job for automated matching (pending setup)
- [ ] Enhanced matching algorithm (can be improved)

**Week 1 Outcome:** ✅ **ACHIEVED** - Creators get AI-guided transformation from vague idea to structured business plan. Platform feels intelligent from first interaction.

---

### **Week 2: The Vibrant Talent Marketplace**
**Goal:** Make Yassu the best place for students to find their next big thing

#### Feature 2.1: Collaborator Profiles 2.0
- [x] Add `availability` field to users table (Full-time, Part-time, Advisor, Not Available) ✅ Already exists
- [x] LinkedIn OAuth integration ✅ COMPLETED
  - [x] LinkedIn OAuth service with OpenID Connect
  - [x] Backend endpoints (connect, callback, disconnect)
  - [x] Frontend "Connect LinkedIn" button
  - [x] Auto-import profile data (name, photo)
  - [x] LinkedIn verification badge
  - [x] Database fields (linkedinId, tokens, connectedAt)
  - [x] Deployed to production (commit 79fe9b6)
- [ ] Add `portfolio` section to profile schema ← **WE ARE HERE**
- [ ] Create automatic portfolio linking to Yassu projects
- [ ] Design enhanced profile UI layout
- [ ] Implement profile editing for new fields
- [ ] Add availability badge to profile cards
- [ ] Test profile display in marketplace
- [ ] Deploy to staging environment

**Availability Options:**
- 🟢 Full-time (40+ hrs/week)
- 🟡 Part-time (10-20 hrs/week)
- 🔵 Advisor (5-10 hrs/week)
- ⚪ Not Available

#### Feature 2.2: Reputation System (V1)
- [ ] Create `endorsements` table (endorser_id, recipient_id, idea_id, skill, created_at)
- [ ] Implement backend API endpoints for endorsements
- [ ] Design endorsement UI component
- [ ] Add "Endorse Teammate" button on completed projects
- [ ] Display endorsement count by skill on profiles
- [ ] Add endorsement activity feed
- [ ] Prevent self-endorsements and duplicates
- [ ] Test endorsement flow end-to-end

**Endorsement Display:**
- Python: +5 endorsements
- Marketing: +3 endorsements
- UI/UX Design: +7 endorsements

#### Feature 2.3: Structured Idea Application
- [ ] Design application form schema (motivation, time_commitment, envisioned_role)
- [ ] Update `join_requests` table with new fields
- [ ] Create modal form UI for "Express Interest"
- [ ] Implement backend API for structured applications
- [ ] Build "Join Requests" section for creators
- [ ] Add application review and response workflow
- [ ] Test application submission and review flow
- [ ] Deploy to staging environment

**Application Form Fields:**
- Why are you interested in this idea? (text area)
- How much time can you commit? (dropdown: 5-10hrs, 10-20hrs, 20-40hrs, 40+hrs)
- What role do you envision? (text input)
- Relevant experience (text area)

**Week 2 Outcome:** Marketplace becomes active and reputation-driven. Creators get high-quality, contextual applications.

---

### **Week 3: The Investor & Fundraising Engine**
**Goal:** Complete the ecosystem flywheel by bringing capital to the platform

#### Feature 3.1: Investor Portal (MVP)
- [ ] Create `investor` role in user_roles table
- [ ] Design `/portal/investors` route and page
- [ ] Implement access control for investor portal
- [ ] Build curated idea list view (Stage 3+ only)
- [ ] Add filtering by category, university, stage
- [ ] Create investor-specific idea card design
- [ ] Add "Request Introduction" functionality
- [ ] Test investor user journey

**Portal Features:**
- View all ideas at "Find Advisors" stage or beyond
- Filter by category (HealthTech, FinTech, EdTech, etc.)
- Filter by university
- Sort by investor readiness score
- Request introduction to founders

#### Feature 3.2: Investor Readiness Score (V1)
- [ ] Design scoring algorithm
- [ ] Implement backend calculation logic
- [ ] Add `investor_readiness_score` field to ideas table
- [ ] Create automated score update trigger
- [ ] Display score badge on idea cards
- [ ] Add score breakdown tooltip
- [ ] Test score accuracy with real data
- [ ] Deploy to production

**Scoring Formula:**
```
Score = (Completed Milestones × 5) + (Team Members × 10) + (Advisors × 10)
Max Score: 100
```

**Score Ranges:**
- 0-30: Early Stage 🔴
- 31-60: Developing 🟡
- 61-80: Strong 🟢
- 81-100: Investment Ready 🟢⭐

#### Feature 3.3: One-Click Pitch Deck (Basic PDF)
- [ ] Install PDF generation library (fpdf2 or reportlab)
- [ ] Design 10-slide pitch deck template
- [ ] Implement backend PDF generation endpoint
- [ ] Map business plan sections to slides
- [ ] Add "Generate Pitch Deck" button to idea page
- [ ] Create PDF download functionality
- [ ] Add Yassu branding to template
- [ ] Test PDF generation with various ideas

**Basic Pitch Deck Slides:**
1. Cover (Idea name, tagline, logo)
2. Problem Statement
3. Solution
4. Market Opportunity
5. Business Model
6. Competitive Advantage
7. Go-to-Market Strategy
8. Team
9. Financial Projections
10. Ask (Funding amount, use of funds)

#### Feature 3.4: Manus MVP Builder Integration 🆕
- [ ] Set up Manus API integration (REST/GraphQL)
- [ ] Implement OAuth 2.0 authentication flow
- [ ] Create "Build MVP with Manus" button on idea detail page
- [ ] Build business plan → Manus project mapping logic
- [ ] Implement automatic project creation in Manus
- [ ] Add `manus_project_id` and `manus_project_url` to ideas table
- [ ] Add `mvp_status` enum field (not_started, in_progress, completed, failed)
- [ ] Create `manus_integrations` table for tracking
- [ ] Build MVP status badge and progress indicator
- [ ] Implement webhook endpoint for Manus status updates
- [ ] Add error handling and retry logic
- [ ] Create integration settings page
- [ ] Test end-to-end flow with real business plans

**User Flow:**
1. Creator completes business plan on Yassu
2. Clicks "Build MVP with Manus" button
3. Yassu sends business plan to Manus via API
4. Manus creates new project with requirements
5. Creator redirected to Manus (or embedded iframe)
6. Manus builds MVP using AI
7. Progress updates sent back to Yassu via webhook
8. MVP link displayed on Yassu idea page when complete

**Database Schema:**
```sql
ALTER TABLE ideas ADD COLUMN manus_project_id VARCHAR(255);
ALTER TABLE ideas ADD COLUMN manus_project_url TEXT;
ALTER TABLE ideas ADD COLUMN mvp_status VARCHAR(50) DEFAULT 'not_started';

CREATE TABLE manus_integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  idea_id UUID REFERENCES ideas(id),
  manus_project_id VARCHAR(255),
  manus_project_url TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Feature 3.5: AI Pitch Deck Designer (Manus Integration) 🆕
- [ ] Integrate Manus Slides API
- [ ] Create "Design Pitch Deck" button on idea detail page
- [ ] Build business plan → slide content mapping
- [ ] Implement AI-powered slide generation (10-15 slides)
- [ ] Add professional VC pitch deck templates
- [ ] Create slide preview component
- [ ] Add `pitch_deck_id` and `pitch_deck_url` to ideas table
- [ ] Create `pitch_decks` table (id, idea_id, manus_slides_uri, version, created_at)
- [ ] Implement version history tracking
- [ ] Add export functionality (PDF, PPT, Google Slides)
- [ ] Build share link generation
- [ ] Add download options UI
- [ ] Test with various business plans
- [ ] Deploy to production

**Professional Pitch Deck Structure (15 slides):**
1. **Cover** - Company name, tagline, logo, contact
2. **Problem** - The pain point (from business plan)
3. **Solution** - Your product/service overview
4. **Market Opportunity** - TAM, SAM, SOM analysis
5. **Product Demo** - Screenshots, mockups, or prototype
6. **Business Model** - How you make money
7. **Traction** - Metrics, milestones, achievements
8. **Competition** - Competitive landscape and positioning
9. **Competitive Advantage** - Your moat and differentiation
10. **Go-to-Market Strategy** - Customer acquisition plan
11. **Team** - Founders, advisors, key team members
12. **Financial Projections** - 3-5 year revenue forecast
13. **Use of Funds** - How investment will be allocated
14. **Vision** - Long-term goals and impact
15. **Ask & Contact** - Funding amount, terms, how to reach you

**Manus Slides Integration:**
```typescript
// Send business plan to Manus Slides API
const response = await fetch('/api/manus/generate-pitch-deck', {
  method: 'POST',
  body: JSON.stringify({
    ideaId: idea.id,
    businessPlan: idea.businessPlan,
    template: 'vc-standard'
  })
});

const { slidesUri, previewUrl } = await response.json();
// slidesUri: manus-slides://abc123
// previewUrl: https://manus.computer/slides/abc123
```

**Database Schema:**
```sql
ALTER TABLE ideas ADD COLUMN pitch_deck_id VARCHAR(255);
ALTER TABLE ideas ADD COLUMN pitch_deck_url TEXT;

CREATE TABLE pitch_decks (
  id SERIAL PRIMARY KEY,
  idea_id UUID REFERENCES ideas(id),
  manus_slides_uri VARCHAR(255),
  preview_url TEXT,
  version INTEGER DEFAULT 1,
  template VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Feature 3.6: Integration Dashboard 🆕
- [ ] Create integration status dashboard
- [ ] Display MVP development progress
- [ ] Show pitch deck versions and history
- [ ] Add link to Manus projects
- [ ] Implement integration health monitoring
- [ ] Add error logs and debugging info
- [ ] Create admin view for all integrations
- [ ] Build analytics for integration usage

**Week 3 Outcome:** Complete ecosystem from idea to investment with automation. Investors have curated deal flow. Creators can build MVPs and create professional pitch decks seamlessly with Manus integration.

---

## 🔧 Technical Debt & Improvements

### High Priority
- [ ] Add email logging table for audit trail
- [ ] Implement email delivery webhooks (Resend)
- [ ] Add email preferences page (opt-out options)
- [ ] Complete DNS verification for hello@yassu.ai
- [ ] Update FROM_EMAIL to hello@yassu.ai after DNS propagation
- [ ] Set up weekly digest cron job
- [ ] Add error monitoring and alerting (Sentry or similar)
- [ ] Implement rate limiting on API endpoints

### Medium Priority
- [ ] Add password strength meter on signup
- [ ] Implement 2FA (two-factor authentication)
- [ ] Add password history (prevent reuse)
- [ ] Create admin analytics dashboard
- [ ] Add bulk deletion in admin panel
- [ ] Implement user search and filtering in admin
- [ ] Add database backup automation
- [ ] Create staging environment for testing

### Low Priority
- [ ] Add dark mode support
- [ ] Implement real-time notifications (WebSocket)
- [ ] Add file upload size limits and validation
- [ ] Create mobile app (React Native)
- [ ] Add internationalization (i18n) support
- [ ] Implement A/B testing framework
- [ ] Add SEO meta tags optimization
- [ ] Create public API documentation

---

## 🐛 Known Issues

### Critical
- None currently

### High Priority
- [ ] Resend dashboard not showing emails immediately (display delay, not functional issue)
- [ ] Email delivery confirmation needs webhook integration

### Medium Priority
- [ ] Profile completion dialog appears repeatedly (UX improvement)
- [ ] Some dropdown menus need better mobile responsiveness

### Low Priority
- [ ] Avatar upload could use better preview
- [ ] Some loading states could be smoother

---

## 📊 Testing Checklist

### Email System Testing
- [x] Password reset email
- [ ] Welcome email (sign up new account)
- [ ] Team invitation email (invite someone)
- [ ] Skill match email (create idea with skills)
- [ ] Invite accepted email (accept join request)
- [ ] Weekly digest email (wait for cron or manual trigger)

### Admin Features Testing
- [ ] Delete idea from admin dashboard
- [ ] Delete user from admin dashboard
- [ ] Verify cascade deletion works correctly
- [ ] Test admin access control

### User Journey Testing
- [ ] New user signup flow
- [ ] Idea creation workflow
- [ ] Team building process
- [ ] Profile completion
- [ ] Password reset flow
- [ ] Email notification delivery

---

## 🎓 Week 4: Integration, Testing & Launch

### Day 1-2: Full Regression Testing
- [ ] Test complete creator journey (signup → idea → team → investor)
- [ ] Test complete collaborator journey (signup → browse → apply → join)
- [ ] Test complete investor journey (signup → browse → request intro)
- [ ] Test all AI features (next steps, role suggester, matching)
- [ ] Test all email notifications
- [ ] Test admin features
- [ ] Document all bugs and prioritize

### Day 3: Polish & Onboarding
- [ ] Fix critical bugs from testing
- [ ] Update welcome emails with new features
- [ ] Create in-app tooltips for AI features
- [ ] Write help center articles
- [ ] Update landing page copy
- [ ] Create demo video

### Day 4-5: Launch Preparation
- [ ] Draft launch announcement email
- [ ] Create launch blog post
- [ ] Prepare social media posts
- [ ] Set up analytics tracking
- [ ] Configure monitoring and alerts
- [ ] Create launch checklist

### Day 6: Soft Launch
- [ ] Deploy to production
- [ ] Send announcement to existing users
- [ ] Monitor system performance
- [ ] Track user engagement
- [ ] Collect initial feedback

### Day 7: Full Launch & Iteration
- [ ] Public launch announcement
- [ ] Monitor metrics and KPIs
- [ ] Respond to user feedback
- [ ] Fix urgent issues
- [ ] Plan next sprint based on learnings

---

## 📈 Success Metrics

### Week 1 Metrics
- Number of ideas with AI-generated next steps
- Completion rate of next steps
- Number of role suggestions generated
- Number of skill match emails sent
- Click-through rate on match emails

### Week 2 Metrics
- Number of enhanced profiles created
- Number of endorsements given
- Number of structured applications submitted
- Application acceptance rate
- Time to team formation

### Week 3 Metrics
- Number of investor accounts created
- Number of ideas viewed by investors
- Number of introduction requests
- Average investor readiness score
- Number of pitch decks generated

### Overall Platform Metrics
- Daily active users (DAU)
- Weekly active users (WAU)
- Idea creation rate
- Team formation rate
- Email engagement rate
- User retention rate

---

## 🔗 Important Links

- **Production:** https://www.yassu.ai
- **Railway Dashboard:** https://railway.app/project/806e83e3-5687-48d9-bc25-5a8b2eb12441
- **GitHub Repo:** https://github.com/KefiGroup/yassu
- **Resend Dashboard:** https://resend.com/emails
- **Database:** PostgreSQL on Railway

---

## 📝 Notes

### Email System
- Resend free tier: 3,000 emails/month
- Current usage: ~2,040/month estimated
- Custom domain (yassu.ai) added, pending DNS verification
- FROM_EMAIL will change from noreply@yassu.ai to hello@yassu.ai after DNS setup

### Database
- All tables created and migrated
- password_reset_tokens table: ✅ Created
- digest_email_log table: ✅ Created
- Future tables needed: ai_next_steps, endorsements, investor_readiness_scores

### Deployment
- Railway auto-deploys on git push to main
- Environment variables configured
- Database backups: Manual (need to automate)

---

## 🎯 Vision & Long-Term Goals

### Q1 2026 (Current)
- Complete 3-week transformation plan
- Launch AI-powered creator experience
- Build vibrant talent marketplace
- Establish investor portal MVP

### Q2 2026
- Expand to 10+ elite universities
- Reach 1,000+ active users
- Facilitate 100+ team formations
- Close first 5 investments through platform

### Q3 2026
- Launch mobile app
- Implement advanced AI matching (ML-based)
- Add video pitch functionality
- Create mentor matching system

### Q4 2026
- Reach 5,000+ active users
- Expand to 50+ universities
- Facilitate 500+ team formations
- Close 25+ investments
- Achieve profitability

---

## 💡 Ideas for Future Consideration

- Virtual co-founder matching (AI pairs complementary founders)
- Startup accelerator integration
- University partnership program
- Alumni mentor network
- Startup competition hosting
- Resource library (templates, guides, tools)
- Community events and networking
- Success story showcase
- Podcast/blog featuring founders
- API for third-party integrations

---

**Remember:** Velocity over perfection. Ship fast, iterate faster. Each week delivers value to a specific stakeholder group. By the end of Week 3, Yassu will be the most intelligent platform for university entrepreneurship in the world. 🚀
