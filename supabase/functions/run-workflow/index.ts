import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const workflowPrompts: Record<string, string> = {
  idea_founder_fit: `You are a startup advisor helping a university founder evaluate their idea-founder fit.

Analyze the provided idea and founder context to generate:
1. **Problem Statement**: A crisp, validated problem statement (2-3 sentences)
2. **Founder Motivation Map**: Why this founder is uniquely suited to solve this problem
3. **Initial Hypothesis**: The core hypothesis to validate, with key assumptions

Be specific, actionable, and encouraging while remaining honest about challenges.`,

  competitive_landscape: `You are a market analyst helping a startup understand their competitive landscape.

Based on the idea and context provided, generate:
1. **Market Map**: Overview of the market size, key players, and dynamics
2. **Competitor Grid**: Table of 4-6 key competitors with their strengths, weaknesses, and positioning
3. **Whitespace Analysis**: Gaps in the market and opportunities for differentiation

Use a structured format with clear sections. Be thorough but concise.`,

  risk_moat_builder: `You are a strategic advisor helping a startup identify risks and build defensibility.

Analyze the idea and generate:
1. **SWOT Analysis**: Strengths, Weaknesses, Opportunities, Threats
2. **Moat Report**: What defensible advantages can be built (network effects, data, brand, etc.)
3. **Risk Mitigation Plan**: Top 5 risks and specific mitigation strategies
4. **Defensibility Score**: Rate 0-100 with justification

Be realistic about challenges while highlighting genuine opportunities.`,

  product_mvp_design: `You are a product strategist helping design an MVP.

Based on the idea, generate:
1. **Feature Backlog**: Prioritized list of features (Must-have, Nice-to-have, Future)
2. **MVP Spec**: Detailed specification for the minimum viable product
3. **Milestones**: 4-6 week roadmap with clear deliverables
4. **Figma-Ready Prompt**: A detailed prompt to generate UI mockups

Focus on what's essential to validate the core hypothesis.`,

  team_talent: `You are a team-building advisor for university startups.

Based on the idea and current team, generate:
1. **Skill Matrix**: Required skills vs current team capabilities
2. **Role Recommendations**: Key roles to hire/recruit with priorities
3. **Personality Fit Notes**: What type of people would complement the team
4. **Outreach Templates**: 2-3 message templates to recruit teammates

Consider the university context and available talent pools.`,

  launch_plan: `You are a go-to-market strategist for startups.

Create a comprehensive launch plan:
1. **Marketing Calendar**: Week-by-week launch activities
2. **Channel Strategy**: Prioritized channels with tactics for each
3. **Launch Checklist**: Pre-launch, launch day, and post-launch tasks
4. **Metrics Dashboard**: Key metrics to track with targets

Focus on scrappy, high-impact tactics appropriate for a student startup.`,

  school_advantage: `You are an advisor helping university founders leverage their school's resources.

Based on the university and idea, provide:
1. **Resources List**: Relevant incubators, labs, grants, competitions at their school
2. **Key Contacts**: Types of professors, alumni, or staff to connect with
3. **Contact Templates**: Email templates for reaching out
4. **School-Specific Roadmap**: How to leverage university resources over 6 months

Be specific to the university mentioned if provided, otherwise give general guidance for top universities.`,

  funding_pitch: `You are a pitch coach for university founders.

Create fundraising materials:
1. **One-Page Pitch**: A compelling narrative covering problem, solution, market, team, ask
2. **Non-Dilutive Funding List**: Relevant grants, competitions, and programs for student startups
3. **Investor Intro Emails**: 2-3 warm intro email templates
4. **Key Metrics to Highlight**: What investors care about at this stage

Focus on early-stage, pre-seed appropriate content.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflowType, inputs, ideaContext, userContext } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = workflowPrompts[workflowType];
    if (!systemPrompt) {
      throw new Error(`Unknown workflow type: ${workflowType}`);
    }

    // Build user context
    let userMessage = "## Context\n\n";
    
    if (ideaContext) {
      userMessage += `### Idea\n`;
      userMessage += `**Title**: ${ideaContext.title || "Not provided"}\n`;
      userMessage += `**Problem**: ${ideaContext.problem || "Not provided"}\n`;
      if (ideaContext.solution) userMessage += `**Solution**: ${ideaContext.solution}\n`;
      if (ideaContext.target_user) userMessage += `**Target User**: ${ideaContext.target_user}\n`;
      if (ideaContext.why_now) userMessage += `**Why Now**: ${ideaContext.why_now}\n`;
      userMessage += "\n";
    }

    if (userContext) {
      userMessage += `### Founder Context\n`;
      if (userContext.university) userMessage += `**University**: ${userContext.university}\n`;
      if (userContext.major) userMessage += `**Major**: ${userContext.major}\n`;
      if (userContext.skills?.length) userMessage += `**Skills**: ${userContext.skills.join(", ")}\n`;
      if (userContext.interests?.length) userMessage += `**Interests**: ${userContext.interests.join(", ")}\n`;
      userMessage += "\n";
    }

    if (inputs) {
      userMessage += `### Additional Input\n`;
      for (const [key, value] of Object.entries(inputs)) {
        if (value) userMessage += `**${key}**: ${value}\n`;
      }
    }

    userMessage += "\n\nPlease generate the analysis based on the context above. Use markdown formatting with clear headers and bullet points.";

    console.log(`Running workflow: ${workflowType}`);
    console.log(`User context length: ${userMessage.length}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Workflow error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
