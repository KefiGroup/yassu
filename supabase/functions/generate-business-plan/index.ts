import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WORKFLOW_TYPES = [
  "idea_founder_fit",
  "competitive_landscape", 
  "risk_moat_builder",
  "product_mvp_design",
  "team_talent",
  "launch_plan",
  "school_advantage",
  "funding_pitch",
] as const;

const WORKFLOW_LABELS: Record<string, string> = {
  idea_founder_fit: "Idea-Founder Fit",
  competitive_landscape: "Competitive Landscape",
  risk_moat_builder: "Risk & Moat Analysis",
  product_mvp_design: "Product & MVP Design",
  team_talent: "Team & Talent Strategy",
  launch_plan: "Go-to-Market Plan",
  school_advantage: "University Advantage",
  funding_pitch: "Funding & Pitch",
};

const workflowPrompts: Record<string, string> = {
  idea_founder_fit: `You are a startup advisor helping a university founder evaluate their idea-founder fit.
Analyze and generate:
1. **Problem Statement**: A crisp, validated problem statement (2-3 sentences)
2. **Founder Motivation Map**: Why this founder is uniquely suited to solve this problem
3. **Initial Hypothesis**: The core hypothesis to validate, with key assumptions
Be specific, actionable, and encouraging while remaining honest about challenges.`,

  competitive_landscape: `You are a market analyst helping a startup understand their competitive landscape.
Generate:
1. **Market Map**: Overview of the market size, key players, and dynamics
2. **Competitor Grid**: Table of 4-6 key competitors with their strengths, weaknesses, and positioning
3. **Whitespace Analysis**: Gaps in the market and opportunities for differentiation
Use a structured format with clear sections. Be thorough but concise.`,

  risk_moat_builder: `You are a strategic advisor helping a startup identify risks and build defensibility.
Analyze and generate:
1. **SWOT Analysis**: Strengths, Weaknesses, Opportunities, Threats
2. **Moat Report**: What defensible advantages can be built (network effects, data, brand, etc.)
3. **Risk Mitigation Plan**: Top 5 risks and specific mitigation strategies
4. **Defensibility Score**: Rate 0-100 with justification
Be realistic about challenges while highlighting genuine opportunities.`,

  product_mvp_design: `You are a product strategist helping design an MVP.
Generate:
1. **Feature Backlog**: Prioritized list of features (Must-have, Nice-to-have, Future)
2. **MVP Spec**: Detailed specification for the minimum viable product
3. **Milestones**: 4-6 week roadmap with clear deliverables
Focus on what's essential to validate the core hypothesis.`,

  team_talent: `You are a team-building advisor for university startups.
Generate:
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
Provide:
1. **Resources List**: Relevant incubators, labs, grants, competitions at their school
2. **Key Contacts**: Types of professors, alumni, or staff to connect with
3. **Contact Templates**: Email templates for reaching out
4. **School-Specific Roadmap**: How to leverage university resources over 6 months
Be specific to the university mentioned if provided, otherwise give general guidance.`,

  funding_pitch: `You are a pitch coach for university founders.
Create fundraising materials:
1. **One-Page Pitch**: A compelling narrative covering problem, solution, market, team, ask
2. **Non-Dilutive Funding List**: Relevant grants, competitions, and programs for student startups
3. **Investor Intro Emails**: 2-3 warm intro email templates
4. **Key Metrics to Highlight**: What investors care about at this stage
Focus on early-stage, pre-seed appropriate content.`,
};

async function runSingleWorkflow(
  workflowType: string,
  ideaContext: any,
  userContext: any,
  apiKey: string
): Promise<string> {
  const systemPrompt = workflowPrompts[workflowType];
  
  let userMessage = "## Context\n\n";
  
  if (ideaContext) {
    userMessage += `### Idea\n`;
    userMessage += `**Title**: ${ideaContext.title || "Not provided"}\n`;
    userMessage += `**Problem**: ${ideaContext.problem || "Not provided"}\n`;
    if (ideaContext.solution) userMessage += `**Solution**: ${ideaContext.solution}\n`;
    if (ideaContext.target_user) userMessage += `**Target User**: ${ideaContext.target_user}\n`;
    if (ideaContext.why_now) userMessage += `**Why Now**: ${ideaContext.why_now}\n`;
    if (ideaContext.assumptions) userMessage += `**Assumptions**: ${ideaContext.assumptions}\n`;
    if (ideaContext.desired_teammates) userMessage += `**Desired Teammates**: ${ideaContext.desired_teammates}\n`;
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

  userMessage += "\n\nPlease generate the analysis based on the context above. Use markdown formatting with clear headers and bullet points.";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Workflow ${workflowType} error:`, response.status, errorText);
    throw new Error(`Workflow ${workflowType} failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { ideaId } = await req.json();

    if (!ideaId) {
      throw new Error("ideaId is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch the idea
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .single();

    if (ideaError || !idea) {
      throw new Error("Idea not found");
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, universities(name)")
      .eq("id", idea.created_by)
      .single();

    const userContext = profile ? {
      university: profile.universities?.name,
      major: profile.major,
      skills: profile.skills,
      interests: profile.interests,
    } : null;

    console.log(`Generating business plan for idea: ${idea.title}`);

    // Create a workflow run record
    const { data: workflowRun, error: runError } = await supabase
      .from("workflow_runs")
      .insert({
        user_id: idea.created_by,
        idea_id: ideaId,
        workflow_type: "idea_founder_fit", // Primary type for the combined run
        status: "running",
        inputs: { type: "full_business_plan" },
      })
      .select()
      .single();

    if (runError) {
      console.error("Error creating workflow run:", runError);
    }

    // Run all 8 workflows in parallel (in batches of 2 to avoid rate limits)
    const results: Record<string, string> = {};
    
    for (let i = 0; i < WORKFLOW_TYPES.length; i += 2) {
      const batch = WORKFLOW_TYPES.slice(i, i + 2);
      const batchResults = await Promise.all(
        batch.map(async (workflowType) => {
          try {
            console.log(`Running workflow: ${workflowType}`);
            const content = await runSingleWorkflow(workflowType, idea, userContext, LOVABLE_API_KEY);
            return { workflowType, content, success: true };
          } catch (error) {
            console.error(`Workflow ${workflowType} failed:`, error);
            return { workflowType, content: `Error generating ${WORKFLOW_LABELS[workflowType]}`, success: false };
          }
        })
      );

      for (const result of batchResults) {
        results[result.workflowType] = result.content;
      }

      // Small delay between batches to avoid rate limits
      if (i + 2 < WORKFLOW_TYPES.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Compile the full business plan
    let businessPlan = `# Business Plan: ${idea.title}\n\n`;
    businessPlan += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
    businessPlan += `---\n\n`;

    for (const workflowType of WORKFLOW_TYPES) {
      businessPlan += `## ${WORKFLOW_LABELS[workflowType]}\n\n`;
      businessPlan += results[workflowType] || "Not available";
      businessPlan += "\n\n---\n\n";
    }

    // Save the business plan as an artifact
    if (workflowRun) {
      await supabase
        .from("workflow_artifacts")
        .insert({
          workflow_run_id: workflowRun.id,
          content: businessPlan,
          metadata: { 
            type: "full_business_plan",
            sections: Object.keys(results),
            idea_title: idea.title,
          },
        });

      // Mark workflow run as complete
      await supabase
        .from("workflow_runs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", workflowRun.id);
    }

    console.log(`Business plan generated successfully for: ${idea.title}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        businessPlan,
        workflowRunId: workflowRun?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Business plan generation error:", error);
    
    if (error instanceof Error && error.message.includes("429")) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (error instanceof Error && error.message.includes("402")) {
      return new Response(
        JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
