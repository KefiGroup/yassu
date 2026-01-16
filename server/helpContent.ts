export interface HelpTopic {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  content: string;
}

export const helpTopics: HelpTopic[] = [
  // Getting Started
  {
    id: "getting-started",
    category: "Getting Started",
    title: "How to get started on Yassu",
    keywords: ["start", "begin", "new", "first", "how to use", "getting started"],
    content: `To get started on Yassu:
1. Complete your profile with your skills, interests, and university
2. Post your first startup idea
3. Generate an AI-powered business plan
4. Connect with potential co-founders
5. Build your team and start your entrepreneurial journey`
  },
  {
    id: "complete-profile",
    category: "Getting Started",
    title: "How to complete your profile",
    keywords: ["profile", "skills", "interests", "university", "bio", "about me", "edit profile"],
    content: `To complete your profile:
1. Click on your avatar in the top-right corner
2. Select "Profile" from the dropdown
3. Fill in your skills (what you're good at)
4. Add your interests (what you're passionate about)
5. Select your university and club type
6. Write a brief bio about yourself
A complete profile helps others find you as a potential co-founder or team member.`
  },

  // Ideas
  {
    id: "post-idea",
    category: "Ideas",
    title: "How to post a startup idea",
    keywords: ["post", "idea", "create", "new idea", "startup", "submit"],
    content: `To post a new startup idea:
1. Go to "My Ideas" in the sidebar
2. Click the "New Idea" button
3. Enter your idea name and description
4. Your idea starts as private by default
5. Toggle visibility to public when you're ready to share
6. Click "Create Idea" to save`
  },
  {
    id: "edit-idea",
    category: "Ideas",
    title: "How to edit my idea",
    keywords: ["edit", "update", "change", "modify", "idea"],
    content: `To edit your startup idea:
1. Go to "My Ideas" in the sidebar
2. Click on the idea you want to edit
3. Click the "Edit" button at the top
4. Update your idea name, description, or visibility
5. Save your changes`
  },
  {
    id: "idea-visibility",
    category: "Ideas",
    title: "Public vs Private ideas",
    keywords: ["public", "private", "visibility", "hide", "show", "share"],
    content: `Your ideas can be either public or private:
- **Private**: Only you can see the idea. Great for early-stage brainstorming.
- **Public**: Visible to all Yassu users. Helps you find co-founders and get feedback.
Toggle visibility anytime from your idea's detail page.`
  },

  // Business Plan
  {
    id: "business-plan-overview",
    category: "Business Plan",
    title: "What is the AI Business Plan?",
    keywords: ["business plan", "AI", "generate", "what is", "overview"],
    content: `The AI Business Plan is Yassu's powerful tool that generates comprehensive business plans for your startup idea. It includes 9 sections:
1. Executive Summary
2. Problem & Solution
3. Target Audience
4. Competitive Landscape
5. Risk & Moat Analysis
6. Revenue Model
7. MVP Design
8. Design & Branding
9. Launch & Growth
Each section is customized based on your business type (Tech, F&B, Fashion, Service, Hardware, etc.)`
  },
  {
    id: "generate-business-plan",
    category: "Business Plan",
    title: "How to generate a business plan",
    keywords: ["generate", "create", "business plan", "AI", "start"],
    content: `To generate your AI-powered business plan:
1. Go to your idea's detail page
2. Click on the "Business Plan" tab
3. Click "Generate Business Plan"
4. The AI will analyze your idea and create all 9 sections
5. Wait for generation to complete (this may take a minute)
6. Review and edit each section as needed`
  },
  {
    id: "edit-business-plan",
    category: "Business Plan",
    title: "How to edit my business plan",
    keywords: ["edit", "modify", "change", "business plan", "update"],
    content: `To edit your business plan:
1. Go to your idea's Business Plan tab
2. Click on any section to expand it
3. Click the "Edit" button to enter edit mode
4. Make your changes using the markdown editor
5. Click "Save" to keep your changes
You can also regenerate individual sections using the "Regenerate" button.`
  },
  {
    id: "regenerate-section",
    category: "Business Plan",
    title: "How to regenerate a business plan section",
    keywords: ["regenerate", "redo", "refresh", "section", "AI"],
    content: `To regenerate a specific section:
1. Go to the business plan section you want to update
2. Click the "Regenerate" button
3. The AI will create new content for that section
4. Your previous version is replaced with the new content
Note: Regenerating will overwrite your manual edits in that section.`
  },

  // Pitch Deck
  {
    id: "pitch-deck-overview",
    category: "Pitch Deck",
    title: "What is the Pitch Deck Generator?",
    keywords: ["pitch deck", "investor", "slides", "presentation", "what is"],
    content: `The Pitch Deck Generator creates investor-ready presentation slides from your business plan. Features include:
- Auto-analysis to determine investor type (Angel vs VC)
- Full 10-slide deck or 6-slide Warm Intro version
- "Investor-Proof This Deck" refinement feature
- Metrics validation for each slide
- Copy-paste format for design tools
Your business plan must be generated first.`
  },
  {
    id: "generate-pitch-deck",
    category: "Pitch Deck",
    title: "How to generate a pitch deck",
    keywords: ["generate", "create", "pitch deck", "slides"],
    content: `To generate your pitch deck:
1. First, make sure you have a completed business plan
2. Go to your idea and click on "Pitch Deck" tab
3. Click "Generate Pitch Deck"
4. Choose between Full Deck (10 slides) or Warm Intro (6 slides)
5. The AI will create slides based on your business plan
6. Review and refine using "Investor-Proof This Deck"`
  },

  // Pitch Preparation
  {
    id: "pitch-prep-overview",
    category: "Pitch Preparation",
    title: "What is Pitch Preparation?",
    keywords: ["pitch prep", "preparation", "practice", "Q&A", "investor questions"],
    content: `Pitch Preparation helps you deliver your pitch confidently and handle investor Q&A. It includes:
- Spoken delivery scripts for each slide
- Investor objection generator with 10 categories
- Risk-level classification for objections
- Live Q&A response playbook
- Rapid-fire rehearsal drill
- Practice mode to test yourself`
  },

  // MVP Builder
  {
    id: "mvp-builder",
    category: "MVP Builder",
    title: "What is the MVP Builder?",
    keywords: ["MVP", "minimum viable product", "build", "prototype"],
    content: `The MVP Builder helps you plan your Minimum Viable Product. It provides:
- Feature prioritization guidance
- Technical requirements for your business type
- Timeline and milestone planning
- Resource estimation
Access it from your idea's detail page after generating your business plan.`
  },

  // Team Building
  {
    id: "find-cofounder",
    category: "Team Building",
    title: "How to find a co-founder",
    keywords: ["co-founder", "cofounder", "partner", "find", "team"],
    content: `To find a co-founder:
1. Go to "Collaborators" in the sidebar
2. Use filters to search by skills, interests, or university
3. Browse potential co-founder profiles
4. Click "Connect" to send a connection request
5. Once connected, you can message them and invite to your team`
  },
  {
    id: "invite-team",
    category: "Team Building",
    title: "How to invite someone to my team",
    keywords: ["invite", "team", "add", "member", "join"],
    content: `To invite someone to your team:
1. First, connect with them on the platform
2. Go to your idea's detail page
3. Click on the "Team" section
4. Click "Invite Member"
5. Select the person from your connections
6. Choose their role (Co-founder, Advisor, etc.)
7. Send the invitation`
  },
  {
    id: "join-requests",
    category: "Team Building",
    title: "How to manage join requests",
    keywords: ["join", "request", "approve", "reject", "team"],
    content: `To manage team join requests:
1. Go to your Dashboard
2. Check the "Team Join Requests" section
3. Review pending requests
4. Click "Accept" to add them to your team
5. Or click "Decline" to reject the request`
  },

  // Connections
  {
    id: "connect-users",
    category: "Connections",
    title: "How to connect with other users",
    keywords: ["connect", "connection", "network", "request", "add"],
    content: `To connect with other users:
1. Go to "Collaborators" or browse public ideas
2. Find someone you'd like to connect with
3. Click the "Connect" button on their profile
4. Wait for them to accept your request
5. Once connected, you can message each other and invite to teams`
  },
  {
    id: "view-connections",
    category: "Connections",
    title: "How to view my connections",
    keywords: ["connections", "view", "list", "network", "contacts"],
    content: `To view your connections:
1. Go to your Profile page
2. Click on the "Connections" tab
3. See all your accepted connections
4. You can also see pending requests sent and received`
  },

  // Messaging
  {
    id: "send-message",
    category: "Messaging",
    title: "How to send a message",
    keywords: ["message", "chat", "send", "DM", "direct message"],
    content: `To send a message:
1. You must be connected with the person first
2. Go to "Messages" in the sidebar
3. Click "New Message" or select an existing conversation
4. Type your message and click Send
You'll receive email notifications for new messages.`
  },

  // Collaborators
  {
    id: "collaborators",
    category: "Collaborators",
    title: "How to find collaborators",
    keywords: ["collaborators", "marketplace", "find", "browse", "filter"],
    content: `The Collaborators section helps you discover other founders:
1. Go to "Collaborators" in the sidebar
2. Use filters to narrow your search:
   - Role (Founder, Advisor, Ambassador)
   - Skills (Technical, Design, Business, etc.)
   - Interests
   - University
   - Club type
3. Click on profiles to learn more
4. Send connection requests to start collaborating`
  },

  // Badges
  {
    id: "badges",
    category: "Badges",
    title: "What are Ambassador and Advisor badges?",
    keywords: ["badge", "ambassador", "advisor", "verified", "special"],
    content: `Yassu offers special badges:
- **Ambassador**: Community leaders who promote Yassu at their university
- **Advisor**: Experienced mentors who guide student founders
Badges are granted by Yassu admins and appear on your profile. Contact an admin if you're interested in becoming an Ambassador or Advisor.`
  },

  // Announcements
  {
    id: "announcements",
    category: "Announcements",
    title: "Where can I see platform announcements?",
    keywords: ["announcement", "news", "update", "banner", "notification"],
    content: `Platform announcements appear in two places:
1. **Banner Bar**: Important announcements show at the top of the portal
2. **Notification Bell**: Click the bell icon to see all active announcements
Announcements include maintenance notices, events, updates, and general news.`
  },

  // Account
  {
    id: "logout",
    category: "Account",
    title: "How to log out",
    keywords: ["logout", "log out", "sign out", "exit"],
    content: `To log out:
1. Click on your avatar in the top-right corner
2. Select "Log out" from the dropdown menu
You'll be redirected to the login page.`
  },
  {
    id: "change-password",
    category: "Account",
    title: "How to change my password",
    keywords: ["password", "change", "reset", "security"],
    content: `To change your password:
1. Click on your avatar in the top-right corner
2. Go to "Profile"
3. Look for the password or security section
4. Enter your current password and new password
5. Save your changes`
  },

  // Journey Progress
  {
    id: "journey-tracker",
    category: "Journey Progress",
    title: "What is the Journey Progress Tracker?",
    keywords: ["journey", "progress", "tracker", "milestones", "steps"],
    content: `The Journey Progress Tracker shows your startup's development stages:
1. Post Idea
2. Business Plan
3. Find Advisors
4. Form Team
5. Build MVP
6. Yassu Foundry
7. Seek Funding
Each step can be completed in any order. Track your progress from your idea's detail page.`
  },

  // Privacy & Support
  {
    id: "idea-privacy",
    category: "Privacy",
    title: "Who can see my ideas?",
    keywords: ["privacy", "who can see", "visible", "hidden"],
    content: `Your idea visibility depends on its setting:
- **Private ideas**: Only visible to you
- **Public ideas**: Visible to all Yassu users
Team members can always see ideas they're part of. Admins can view all ideas for moderation purposes.`
  },
  {
    id: "contact-support",
    category: "Support",
    title: "How to contact support",
    keywords: ["support", "help", "contact", "issue", "problem", "bug"],
    content: `For platform support:
1. Try asking Kefi (that's me!) your question first
2. Check the platform announcements for known issues
3. Contact the Yassu team through the platform
We're here to help you on your founder journey!`
  },
  {
    id: "submit-suggestion",
    category: "Support",
    title: "How to submit a suggestion",
    keywords: ["suggestion", "feedback", "improve", "feature request", "idea for yassu", "recommend"],
    content: `You can submit suggestions for improving Yassu directly through me (Kefi)! 
Just tell me your suggestion by saying something like:
- "I have a suggestion: [your idea]"
- "I'd like to suggest: [your improvement idea]"
- "Feature request: [what you'd like to see]"
The Yassu team reviews all suggestions and uses them to make the platform better for everyone.`
  }
];

export function searchHelpTopics(query: string): HelpTopic[] {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);
  
  return helpTopics
    .map(topic => {
      let score = 0;
      
      // Check title match
      if (topic.title.toLowerCase().includes(lowerQuery)) score += 10;
      
      // Check keyword matches
      for (const keyword of topic.keywords) {
        if (lowerQuery.includes(keyword)) score += 5;
        for (const word of words) {
          if (keyword.includes(word)) score += 2;
        }
      }
      
      // Check content match
      for (const word of words) {
        if (topic.content.toLowerCase().includes(word)) score += 1;
      }
      
      return { topic, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.topic);
}

export function getHelpContext(): string {
  return helpTopics.map(topic => 
    `## ${topic.title}\nCategory: ${topic.category}\n${topic.content}`
  ).join('\n\n');
}
