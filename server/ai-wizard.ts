import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export interface RawIdeaInput {
  rawIdea: string;
  clarifications?: {
    targetUser?: string;
    painPoint?: string;
    currentSolution?: string;
    additionalContext?: string;
  };
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  type: 'single-choice' | 'multiple-choice' | 'text';
  options?: string[];
  required: boolean;
}

export interface RefinedIdea {
  title: string;
  problem: string;
  solution: string;
  targetUser: string;
  whyNow: string;
  assumptions?: string;
  suggestedTags: string[];
  confidence: number;
}

export interface IdeaRefinementResponse {
  stage: 'analysis' | 'clarification' | 'refined';
  analysis?: {
    coreProblem: string;
    identifiedTarget: string;
    suggestedSolution: string;
  };
  clarifyingQuestions?: ClarifyingQuestion[];
  refinedIdea?: RefinedIdea;
}

/**
 * Analyzes a raw idea input and determines if clarification is needed
 */
export async function analyzeRawIdea(input: RawIdeaInput): Promise<IdeaRefinementResponse> {
  const { rawIdea, clarifications } = input;

  // If we have clarifications, generate the refined idea directly
  if (clarifications && Object.keys(clarifications).length > 0) {
    return await generateRefinedIdea(rawIdea, clarifications);
  }

  // First pass: Analyze the raw idea and determine if we need clarification
  const analysisPrompt = `You are an expert startup advisor helping university students refine their business ideas.

Analyze this raw idea from a student:
"${rawIdea}"

Your task:
1. Extract the core problem being described
2. Identify who might be affected by this problem
3. Determine if you have enough information to create a structured business idea

Respond in JSON format:
{
  "coreProblem": "Clear statement of the problem",
  "identifiedTarget": "Who faces this problem",
  "needsClarification": boolean,
  "confidence": 0-100,
  "reasoning": "Why you need or don't need more info"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful startup advisor. Always respond with valid JSON only, no markdown formatting.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      temperature: 0.7,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    // If confidence is high enough, skip clarification
    if (!analysis.needsClarification || analysis.confidence > 75) {
      return await generateRefinedIdea(rawIdea, {});
    }

    // Generate clarifying questions
    const questions = await generateClarifyingQuestions(rawIdea, analysis);

    return {
      stage: 'clarification',
      analysis: {
        coreProblem: analysis.coreProblem,
        identifiedTarget: analysis.identifiedTarget,
        suggestedSolution: '',
      },
      clarifyingQuestions: questions,
    };
  } catch (error: any) {
    console.error('Error analyzing raw idea:', error);
    console.error('Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
    });
    throw new Error(error?.message || 'Failed to analyze idea. Please try again.');
  }
}

/**
 * Generates clarifying questions based on the initial analysis
 */
async function generateClarifyingQuestions(
  rawIdea: string,
  analysis: any
): Promise<ClarifyingQuestion[]> {
  const questionsPrompt = `Based on this raw idea: "${rawIdea}"

And this analysis:
- Core Problem: ${analysis.coreProblem}
- Target: ${analysis.identifiedTarget}

Generate 2-4 clarifying questions that would help refine this into a strong business idea.

Focus on:
1. Target user specificity
2. Main pain point
3. Current solutions (if any)
4. Why this matters now

IMPORTANT: All questions should be optional (required: false) so users can skip them if they want.

Respond in JSON format:
{
  "questions": [
    {
      "id": "unique-id",
      "question": "Question text",
      "type": "single-choice" | "multiple-choice" | "text",
      "options": ["option1", "option2"] (if applicable),
      "required": false
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful startup advisor. Always respond with valid JSON only, no markdown formatting.',
        },
        {
          role: 'user',
          content: questionsPrompt,
        },
      ],
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
    return result.questions || [];
  } catch (error: any) {
    console.error('Error generating clarifying questions:', error);
    console.error('Error details:', error?.message);
    // Return default questions if AI fails
    return [
      {
        id: 'target-user',
        question: 'Who specifically faces this problem?',
        type: 'text',
        required: false,
      },
      {
        id: 'pain-point',
        question: 'What is the biggest pain point or frustration?',
        type: 'text',
        required: false,
      },
    ];
  }
}

/**
 * Generates a refined, structured idea from raw input and clarifications
 */
async function generateRefinedIdea(
  rawIdea: string,
  clarifications: any
): Promise<IdeaRefinementResponse> {
  const refinementPrompt = `You are an expert startup advisor helping a university student refine their business idea.

Raw Idea:
"${rawIdea}"

${
  Object.keys(clarifications).length > 0
    ? `Additional Context:
${Object.entries(clarifications)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}`
    : ''
}

Create a structured business idea with:
1. A compelling title (2-5 words)
2. A clear problem statement (2-3 sentences)
3. A proposed solution (2-3 sentences)
4. Target user description (1-2 sentences)
5. Why now / timing (1-2 sentences)
6. Key assumptions to validate (2-3 bullet points)
7. Suggested tags/categories (3-5 tags)

Make it sound professional but authentic to a student founder.

Respond in JSON format:
{
  "title": "Catchy product name",
  "problem": "Clear problem statement",
  "solution": "Proposed solution approach",
  "targetUser": "Specific target user description",
  "whyNow": "Why this is timely",
  "assumptions": "Key assumptions to test (bullet points)",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "confidence": 0-100
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful startup advisor specializing in university entrepreneurship. Always respond with valid JSON only, no markdown formatting.',
        },
        {
          role: 'user',
          content: refinementPrompt,
        },
      ],
      temperature: 0.7,
    });

    const refinedIdea = JSON.parse(response.choices[0].message.content || '{}');

    return {
      stage: 'refined',
      refinedIdea: {
        title: refinedIdea.title || 'Untitled Idea',
        problem: refinedIdea.problem || rawIdea,
        solution: refinedIdea.solution || '',
        targetUser: refinedIdea.targetUser || 'University students',
        whyNow: refinedIdea.whyNow || '',
        assumptions: refinedIdea.assumptions || '',
        suggestedTags: refinedIdea.suggestedTags || [],
        confidence: refinedIdea.confidence || 70,
      },
    };
  } catch (error: any) {
    console.error('Error generating refined idea:', error);
    console.error('Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
    });
    throw new Error(error?.message || 'Failed to refine idea. Please try again.');
  }
}

/**
 * Generates a complete business plan from a refined idea
 */
export async function generateBusinessPlanFromWizard(refinedIdea: RefinedIdea): Promise<any> {
  // This will integrate with your existing business plan generation
  // For now, return the refined idea formatted for business plan generation
  return {
    title: refinedIdea.title,
    problem: refinedIdea.problem,
    solution: refinedIdea.solution,
    targetUser: refinedIdea.targetUser,
    whyNow: refinedIdea.whyNow,
    assumptions: refinedIdea.assumptions,
  };
}
