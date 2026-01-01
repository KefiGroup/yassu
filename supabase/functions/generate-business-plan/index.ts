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

// First step: Analyze the raw idea and extract structured information
async function analyzeRawIdea(rawIdea: string, title: string, apiKey: string): Promise<{
  problem: string;
  solution: string;
  target_user: string;
  why_now: string;
  assumptions: string;
  desired_teammates: string;
  tags: string[];
}> {
  const systemPrompt = `You are an expert startup analyst. Given a raw, unstructured idea description, your job is to extract and structure the key components of the startup idea.

You MUST respond with valid JSON only, no markdown or explanation. The JSON must have these exact fields:
{
  "problem": "A clear 2-3 sentence description of the problem being solved",
  "solution": "A clear description of the proposed solution",
  "target_user": "Who is the primary target user/customer",
  "why_now": "Why is this the right time for this idea (market trends, technology changes, etc.)",
  "assumptions": "Key assumptions that need to be validated",
  "desired_teammates": "What skills/roles would be helpful for a co-founder or team",
  "tags": ["array", "of", "relevant", "tags"]
}

Be insightful and add value - don't just rephrase what the user said. Infer and expand based on your knowledge of the market and startups.`;

  const userMessage = `Idea Title: ${title}

Raw Idea Description:
${rawIdea}

Please analyze this and extract the structured components. Respond with JSON only.`;

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
    console.error("Idea analysis error:", response.status, errorText);
    throw new Error(`Idea analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  // Parse the JSON response
  try {
    // Remove any markdown code blocks if present
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    // Return defaults if parsing fails
    return {
      problem: rawIdea,
      solution: "To be determined through analysis",
      target_user: "To be identified",
      why_now: "Market opportunity exists",
      assumptions: "Core assumptions need validation",
      desired_teammates: "Technical and business co-founders",
      tags: ["Startup"],
    };
  }
}

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
    const { ideaId, rawIdea } = await req.json();

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

    console.log(`Processing idea: ${idea.title}`);

    // Step 1: If rawIdea is provided, analyze it first to extract structured data
    let enrichedIdea = { ...idea };
    
    if (rawIdea) {
      console.log("Analyzing raw idea to extract structured information...");
      
      try {
        const analysis = await analyzeRawIdea(rawIdea, idea.title, LOVABLE_API_KEY);
        
        // Update the idea with extracted information
        const { error: updateError } = await supabase
          .from("ideas")
          .update({
            problem: analysis.problem,
            solution: analysis.solution,
            target_user: analysis.target_user,
            why_now: analysis.why_now,
            assumptions: analysis.assumptions,
            desired_teammates: analysis.desired_teammates,
          })
          .eq("id", ideaId);

        if (updateError) {
          console.error("Error updating idea with analysis:", updateError);
        } else {
          console.log("Idea enriched with AI analysis");
          enrichedIdea = { ...idea, ...analysis };
        }

        // Add tags
        if (analysis.tags && analysis.tags.length > 0) {
          const tagInserts = analysis.tags.slice(0, 5).map((tag: string) => ({
            idea_id: ideaId,
            tag: tag,
          }));
          
          await supabase.from("idea_tags").insert(tagInserts);
          console.log(`Added ${tagInserts.length} tags`);
        }
      } catch (analysisError) {
        console.error("Error analyzing raw idea:", analysisError);
        // Continue with original idea data
      }
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

    console.log(`Generating business plan for idea: ${enrichedIdea.title}`);

    // Create a workflow run record
    const { data: workflowRun, error: runError } = await supabase
      .from("workflow_runs")
      .insert({
        user_id: idea.created_by,
        idea_id: ideaId,
        workflow_type: "idea_founder_fit", // Primary type for the combined run
        status: "running",
        inputs: { type: "full_business_plan", rawIdea: rawIdea || null },
      })
      .select()
      .single();

    if (runError) {
      console.error("Error creating workflow run:", runError);
    }

    // Step 2: Run all 8 workflows in parallel (in batches of 2 to avoid rate limits)
    const results: Record<string, string> = {};
    
    for (let i = 0; i < WORKFLOW_TYPES.length; i += 2) {
      const batch = WORKFLOW_TYPES.slice(i, i + 2);
      const batchResults = await Promise.all(
        batch.map(async (workflowType) => {
          try {
            console.log(`Running workflow: ${workflowType}`);
            const content = await runSingleWorkflow(workflowType, enrichedIdea, userContext, LOVABLE_API_KEY);
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
    let businessPlan = `# Business Plan: ${enrichedIdea.title}\n\n`;
    businessPlan += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
    
    // Add executive summary from analyzed idea
    businessPlan += `## Executive Summary\n\n`;
    businessPlan += `**Problem:** ${enrichedIdea.problem}\n\n`;
    businessPlan += `**Solution:** ${enrichedIdea.solution || 'See Product & MVP Design section'}\n\n`;
    businessPlan += `**Target User:** ${enrichedIdea.target_user || 'See Idea-Founder Fit section'}\n\n`;
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
            idea_title: enrichedIdea.title,
            analyzed_from_raw: !!rawIdea,
          },
        });

      // Mark workflow run as complete
      await supabase
        .from("workflow_runs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", workflowRun.id);
    }

    console.log(`Business plan generated successfully for: ${enrichedIdea.title}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        businessPlan,
        workflowRunId: workflowRun?.id,
        enrichedIdea: rawIdea ? enrichedIdea : null,
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
