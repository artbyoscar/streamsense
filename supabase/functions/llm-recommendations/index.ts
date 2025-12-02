/**
 * LLM Recommendations Edge Function
 * Secure serverless function for Claude API calls
 *
 * Features:
 * - Authenticates users
 * - Caches responses (24-hour TTL)
 * - Rate limits (5 calls/user/day)
 * - Validates recommendations against TMDb
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CACHE_TTL_HOURS = 24;
const RATE_LIMIT_PER_DAY = 5;

interface LLMRequest {
  query: string;
  userProfile?: {
    tasteSignature: string;
    topGenres: string[];
    topDirectors: string[];
    topActors: string[];
    watchedCount: number;
  };
  context?: string;
}

interface LLMResponse {
  recommendations: Array<{
    tmdbId: number;
    title: string;
    reason: string;
    mediaType: 'movie' | 'tv';
  }>;
  explanation: string;
  cached: boolean;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request
    const body: LLMRequest = await req.json();
    const { query, userProfile, context } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Check cache first
    const cacheKey = `${user.id}:${query}`;
    const { data: cached } = await supabase
      .from('llm_recommendations_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('query_hash', hashString(query))
      .single();

    if (cached) {
      const cacheAge = Date.now() - new Date(cached.created_at).getTime();
      const cacheMaxAge = CACHE_TTL_HOURS * 60 * 60 * 1000;

      if (cacheAge < cacheMaxAge) {
        console.log('[LLM] Cache hit for user:', user.id);
        return new Response(JSON.stringify({
          ...cached.response,
          cached: true,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 4. Check rate limit
    const { count } = await supabase
      .from('llm_recommendations_cache')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (count && count >= RATE_LIMIT_PER_DAY) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: `You can make up to ${RATE_LIMIT_PER_DAY} LLM recommendation requests per day. Please try again tomorrow.`,
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Call Claude API
    console.log('[LLM] Calling Claude API for user:', user.id);

    const prompt = buildPrompt(query, userProfile, context);

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.statusText}`);
    }

    const claudeData = await claudeResponse.json();
    const llmText = claudeData.content[0].text;

    // 6. Parse LLM response
    const parsedResponse = parseLLMResponse(llmText);

    // 7. Validate against TMDb
    const validatedRecommendations = await validateRecommendations(
      parsedResponse.recommendations,
      TMDB_API_KEY!
    );

    const response: LLMResponse = {
      recommendations: validatedRecommendations,
      explanation: parsedResponse.explanation,
      cached: false,
    };

    // 8. Cache result
    await supabase.from('llm_recommendations_cache').insert({
      user_id: user.id,
      query_hash: hashString(query),
      query_text: query,
      response: response,
    });

    console.log('[LLM] Successfully generated recommendations for user:', user.id);

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[LLM] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Build prompt for Claude
 */
function buildPrompt(
  query: string,
  userProfile?: LLMRequest['userProfile'],
  context?: string
): string {
  let prompt = `You are a movie and TV show recommendation expert. Your task is to provide personalized recommendations based on the user's query and viewing preferences.

User Query: "${query}"
`;

  if (userProfile) {
    prompt += `
User's Taste Profile:
- Taste Signature: ${userProfile.tasteSignature}
- Top Genres: ${userProfile.topGenres.join(', ')}
- Favorite Directors: ${userProfile.topDirectors.slice(0, 5).join(', ')}
- Favorite Actors: ${userProfile.topActors.slice(0, 5).join(', ')}
- Content Watched: ${userProfile.watchedCount} titles
`;
  }

  if (context) {
    prompt += `
Additional Context: ${context}
`;
  }

  prompt += `
Please provide 5-10 movie or TV show recommendations that match the user's query and preferences.

Respond in the following JSON format:
{
  "recommendations": [
    {
      "title": "Movie or Show Title",
      "year": 2024,
      "mediaType": "movie" or "tv",
      "reason": "Brief explanation of why this matches the user's taste"
    }
  ],
  "explanation": "A brief 2-3 sentence explanation of the overall recommendation strategy"
}

IMPORTANT:
- Only recommend real movies/TV shows that exist
- Include the year to help with identification
- Provide diverse recommendations
- Explain your reasoning clearly
- Format your response as valid JSON`;

  return prompt;
}

/**
 * Parse LLM response text into structured format
 */
function parseLLMResponse(text: string): {
  recommendations: Array<{
    title: string;
    year: number;
    mediaType: 'movie' | 'tv';
    reason: string;
  }>;
  explanation: string;
} {
  try {
    // Extract JSON from response (Claude sometimes adds markdown formatting)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      recommendations: parsed.recommendations || [],
      explanation: parsed.explanation || 'Personalized recommendations based on your taste profile.',
    };
  } catch (error) {
    console.error('[LLM] Error parsing response:', error);
    return {
      recommendations: [],
      explanation: 'Unable to parse recommendations. Please try again.',
    };
  }
}

/**
 * Validate recommendations against TMDb and get TMDb IDs
 */
async function validateRecommendations(
  recommendations: Array<{
    title: string;
    year: number;
    mediaType: 'movie' | 'tv';
    reason: string;
  }>,
  tmdbApiKey: string
): Promise<Array<{
  tmdbId: number;
  title: string;
  reason: string;
  mediaType: 'movie' | 'tv';
}>> {
  const validated = [];

  for (const rec of recommendations) {
    try {
      // Search TMDb for the title
      const searchUrl = `https://api.themoviedb.org/3/search/${rec.mediaType}?api_key=${tmdbApiKey}&query=${encodeURIComponent(rec.title)}&year=${rec.year}`;
      const response = await fetch(searchUrl);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const match = data.results[0];
        validated.push({
          tmdbId: match.id,
          title: rec.mediaType === 'movie' ? match.title : match.name,
          reason: rec.reason,
          mediaType: rec.mediaType,
        });
      } else {
        console.warn(`[LLM] Could not validate: ${rec.title} (${rec.year})`);
      }
    } catch (error) {
      console.error(`[LLM] Error validating ${rec.title}:`, error);
    }
  }

  return validated;
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
