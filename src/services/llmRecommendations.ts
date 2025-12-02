/**
 * LLM-Powered Recommendation Service
 * Layer 4: Uses Claude to provide deeply personalized, reasoning-based recommendations
 *
 * This goes beyond algorithmic matching to provide human-like taste understanding:
 * - Explains WHY recommendations fit the user's taste
 * - Makes thematic and tonal connections
 * - Identifies "stretch" recommendations for taste expansion
 * - Provides conversational explanations
 */

import { tmdbApi } from '@/services/tmdb';
import { contentDNAService, type UserTasteProfile, type ContentDNA } from './contentDNA';

interface ContentItem {
  id: number;
  title: string;
  name?: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  // LLM-specific metadata
  llmReasoning?: string;
  llmConfidence?: number;
  isStretch?: boolean;
}

interface LLMRecommendationRequest {
  userId: string;
  tasteProfile: UserTasteProfile;
  recentWatched: ContentItem[];
  currentMood?: string;
  specificRequest?: string;
  limit?: number;
}

interface LLMRecommendationResponse {
  recommendations: ContentItem[];
  explanation: string;
  strategy: string;
}

export class LLMRecommendationService {
  private apiKey: string;
  private model = 'claude-3-haiku-20240307'; // Fast and cost-effective

  constructor(apiKey?: string) {
    // API key should come from environment variable
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';

    if (!this.apiKey) {
      console.warn('[LLM] No API key provided - LLM recommendations will be disabled');
    }
  }

  /**
   * Get LLM-powered personalized recommendations
   */
  async getPersonalizedRecommendations(
    request: LLMRecommendationRequest
  ): Promise<LLMRecommendationResponse> {
    if (!this.apiKey) {
      console.warn('[LLM] API key not configured - returning empty recommendations');
      return {
        recommendations: [],
        explanation: 'LLM recommendations not available',
        strategy: 'disabled',
      };
    }

    try {
      console.log('[LLM] Generating personalized recommendations for user:', request.userId);

      const prompt = this.buildPrompt(request);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2000,
          temperature: 0.7, // Some creativity for variety
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const parsed = await this.parseResponse(result.content[0].text);

      console.log('[LLM] Generated', parsed.recommendations.length, 'recommendations');
      console.log('[LLM] Strategy:', parsed.strategy);

      return parsed;
    } catch (error) {
      console.error('[LLM] Error getting recommendations:', error);
      return {
        recommendations: [],
        explanation: 'Failed to generate LLM recommendations',
        strategy: 'error',
      };
    }
  }

  /**
   * Get mood-based recommendations with LLM reasoning
   */
  async getMoodBasedRecommendations(
    userId: string,
    tasteProfile: UserTasteProfile,
    mood: string,
    limit: number = 10
  ): Promise<LLMRecommendationResponse> {
    return this.getPersonalizedRecommendations({
      userId,
      tasteProfile,
      recentWatched: [],
      currentMood: mood,
      limit,
    });
  }

  /**
   * Get "next watch" recommendation with detailed reasoning
   */
  async getNextWatch(
    userId: string,
    tasteProfile: UserTasteProfile,
    recentWatched: ContentItem[]
  ): Promise<ContentItem | null> {
    const response = await this.getPersonalizedRecommendations({
      userId,
      tasteProfile,
      recentWatched,
      specificRequest: 'Recommend the ONE perfect next watch based on their recent viewing',
      limit: 1,
    });

    return response.recommendations[0] || null;
  }

  /**
   * Build the prompt for Claude
   */
  private buildPrompt(request: LLMRecommendationRequest): string {
    const { tasteProfile, recentWatched, currentMood, specificRequest, limit = 10 } = request;

    return `You are a sophisticated film and TV recommendation engine with deep knowledge of cinema and television. Based on this user's taste profile, provide highly personalized recommendations.

USER TASTE PROFILE:
- Taste Signature: ${tasteProfile.tasteSignature}
- Preferred Tone: ${this.formatTone(tasteProfile.preferredTone)}
- Key Themes: ${this.formatThemes(tasteProfile.preferredThemes)}
- Favorite Directors: ${tasteProfile.favoriteDirectors.slice(0, 5).map(d => d.name).join(', ')}
- Favorite Actors: ${tasteProfile.favoriteActors.slice(0, 5).map(a => a.name).join(', ')}
- Interest Clusters: ${tasteProfile.interestClusters.map(c => `${c.name} (${Math.round(c.strength * 100)}%)`).join(', ')}
- Pacing Preference: ${this.formatPacing(tasteProfile.preferredPacing)}
- Exploration Appetite: ${this.formatExplorationScore(tasteProfile.explorationScore)}
- Discovery Opportunities: ${tasteProfile.discoveryOpportunities.join('; ')}

${recentWatched.length > 0 ? `RECENTLY WATCHED:
${recentWatched.slice(0, 5).map(w => `- ${w.title || w.name} (${w.vote_average}/10) - ${w.media_type}`).join('\n')}
` : ''}

${currentMood ? `CURRENT MOOD: ${currentMood}\n` : ''}

${specificRequest ? `SPECIFIC REQUEST: ${specificRequest}\n` : ''}

Based on this profile, recommend ${limit} titles that this user would genuinely love. For each recommendation, explain WHY it matches their taste - connect it to specific elements of their profile.

RECOMMENDATION STRATEGY:
1. ${limit - 2} core recommendations - perfect matches for their established taste
2. 2 "stretch" recommendations - titles that could expand their horizons while still respecting their preferences
3. Focus on deep thematic and tonal connections, not just genre matching
4. Consider director/talent connections they'd appreciate
5. Include some hidden gems they likely haven't discovered
6. If mood is specified, prioritize titles that match that emotional state

IMPORTANT CONSTRAINTS:
- Only recommend real movies and TV shows (no made-up titles)
- Provide the exact title and release year
- Be specific about which aspect of their profile each recommendation connects to
- Explain your overall recommendation strategy

Format your response as valid JSON:
{
  "recommendations": [
    {
      "title": "Exact Movie/Show Title",
      "year": 2023,
      "type": "movie" | "tv",
      "reasoning": "Specific 1-2 sentence explanation connecting to their profile",
      "confidence": 0.85,
      "isStretch": false,
      "matchedElements": ["Interest Cluster: Dark Crime Thrillers", "Favorite Director: Denis Villeneuve"]
    }
  ],
  "overallExplanation": "2-3 sentence summary of your recommendation strategy",
  "strategy": "Brief keyword describing approach (e.g., 'tone-matched', 'director-focused', 'thematic-bridge')"
}`;
  }

  /**
   * Parse Claude's response into recommendations
   */
  private async parseResponse(response: string): Promise<LLMRecommendationResponse> {
    try {
      // Extract JSON from response (Claude sometimes adds text before/after JSON)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Invalid response format - missing recommendations array');
      }

      // Look up each recommendation in TMDb to get full details
      const recommendations = await Promise.all(
        parsed.recommendations.map(async (rec: any) => {
          const searchResult = await this.searchTMDb(rec.title, rec.year, rec.type);
          if (searchResult) {
            return {
              ...searchResult,
              llmReasoning: rec.reasoning,
              llmConfidence: rec.confidence || 0.5,
              isStretch: rec.isStretch || false,
            };
          }
          return null;
        })
      );

      const validRecommendations = recommendations.filter((r): r is ContentItem => r !== null);

      console.log('[LLM] Validated', validRecommendations.length, 'of', parsed.recommendations.length, 'recommendations');

      return {
        recommendations: validRecommendations,
        explanation: parsed.overallExplanation || '',
        strategy: parsed.strategy || 'unknown',
      };
    } catch (error) {
      console.error('[LLM] Error parsing response:', error);
      console.error('[LLM] Raw response:', response);
      return {
        recommendations: [],
        explanation: 'Failed to parse LLM response',
        strategy: 'error',
      };
    }
  }

  /**
   * Search TMDb for a specific title
   */
  private async searchTMDb(
    title: string,
    year?: number,
    mediaType?: 'movie' | 'tv'
  ): Promise<ContentItem | null> {
    try {
      // Try exact match first
      const { data } = await tmdbApi.get('/search/multi', {
        params: {
          query: title,
          year,
        },
      });

      if (!data?.results || data.results.length === 0) {
        console.warn('[LLM] No TMDb results for:', title, year);
        return null;
      }

      // Find best match
      let bestMatch = data.results[0];

      // If media type specified, prefer that type
      if (mediaType) {
        const typeMatch = data.results.find((r: any) => r.media_type === mediaType);
        if (typeMatch) {
          bestMatch = typeMatch;
        }
      }

      // Verify it's a movie or TV show (not person)
      if (bestMatch.media_type !== 'movie' && bestMatch.media_type !== 'tv') {
        console.warn('[LLM] Best match is not movie/tv:', bestMatch.media_type);
        return null;
      }

      return {
        id: bestMatch.id,
        title: bestMatch.title || bestMatch.name,
        name: bestMatch.name,
        media_type: bestMatch.media_type,
        poster_path: bestMatch.poster_path,
        backdrop_path: bestMatch.backdrop_path,
        overview: bestMatch.overview,
        vote_average: bestMatch.vote_average,
        vote_count: bestMatch.vote_count,
        release_date: bestMatch.release_date,
        first_air_date: bestMatch.first_air_date,
        genre_ids: bestMatch.genre_ids,
      };
    } catch (error) {
      console.error('[LLM] Error searching TMDb for:', title, error);
      return null;
    }
  }

  /**
   * Format helpers for prompt building
   */

  private formatTone(tone: ContentDNA['tone']): string {
    const sorted = Object.entries(tone)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return sorted.map(([name, value]) => `${name} (${Math.round(value * 100)}%)`).join(', ');
  }

  private formatThemes(themes: ContentDNA['themes']): string {
    const sorted = Object.entries(themes)
      .filter(([_, value]) => value > 0.2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return sorted.map(([name, value]) => `${name} (${Math.round(value * 100)}%)`).join(', ');
  }

  private formatPacing(pacing: ContentDNA['pacing']): string {
    const sorted = Object.entries(pacing)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    return sorted.map(([name, value]) => `${name} (${Math.round(value * 100)}%)`).join(', ');
  }

  private formatExplorationScore(score: number): string {
    if (score > 0.7) return 'High - loves variety and new experiences';
    if (score > 0.4) return 'Moderate - balanced between familiar and new';
    return 'Low - prefers staying in comfort zone';
  }
}

// Export singleton instance (without API key - will be configured at runtime)
export const llmRecommendationService = new LLMRecommendationService();

/**
 * Configure API key at runtime
 */
export const configureLLMService = (apiKey: string) => {
  (llmRecommendationService as any).apiKey = apiKey;
  console.log('[LLM] API key configured');
};
