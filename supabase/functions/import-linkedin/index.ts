import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { linkedinContent } = await req.json();

    if (!linkedinContent || linkedinContent.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: 'Please provide more LinkedIn content (at least 50 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing LinkedIn content, length:', linkedinContent.length);

    const systemPrompt = `You are a professional bio writer for a startup/tech community platform. Your task is to generate a professional bio from LinkedIn profile data.

STRICT RULES:
- Only use information explicitly provided in the input
- NEVER hallucinate or invent companies, degrees, dates, or achievements
- If something is unclear, omit it rather than guess
- Tone: concise, confident, appropriate for founders and tech professionals
- Focus on skills, experience, and what the person is looking for (cofounders, projects, opportunities)

OUTPUT FORMAT (JSON):
{
  "shortBio": "Max 600 characters. Professional summary highlighting key expertise and current focus.",
  "longBio": "Max 1200 characters. More detailed professional narrative including background and goals.",
  "highlights": ["3-6 bullet points of key achievements or expertise areas"],
  "skills": ["Relevant skill tags extracted from the profile, max 10"]
}

Only output valid JSON, no markdown or explanations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a professional bio from this LinkedIn content:\n\n${linkedinContent}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service payment required.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate bio. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      console.error('No content in AI response:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to generate bio content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response from AI
    let parsedBio;
    try {
      // Clean up potential markdown code blocks
      const cleanedContent = generatedContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsedBio = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedContent);
      return new Response(
        JSON.stringify({ error: 'Failed to parse generated bio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize the response
    const result = {
      shortBio: String(parsedBio.shortBio || '').slice(0, 600),
      longBio: String(parsedBio.longBio || '').slice(0, 1200),
      highlights: Array.isArray(parsedBio.highlights) 
        ? parsedBio.highlights.slice(0, 6).map((h: unknown) => String(h))
        : [],
      skills: Array.isArray(parsedBio.skills)
        ? parsedBio.skills.slice(0, 10).map((s: unknown) => String(s))
        : [],
    };

    console.log('Successfully generated bio');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in import-linkedin function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
