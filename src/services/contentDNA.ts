/**
 * Content DNA Service - Netflix-style micro-genre matching
 * Goes beyond basic genres to match content on deeper dimensions:
 * - Mood/Tone (dark, humorous, tense, emotional, cerebral, escapist)
 * - Themes (redemption, revenge, family, identity, etc.)
 * - Pacing (slow, medium, fast, episodic, serialized)
 * - Aesthetic (visually stunning, gritty, stylized)
 * - Narrative structure (non-linear, twist ending, etc.)
 * - Talent DNA (directors, actors, writers)
 */

import { supabase } from '@/config/supabase';
import { tmdbApi } from '@/services/tmdb';

export interface ContentDNA {
  // Core identifiers
  tmdbId: number;
  mediaType: 'movie' | 'tv';

  // MOOD/TONE (0-1 scale)
  tone: {
    dark: number;        // The Batman vs Paddington
    humorous: number;    // Comedy elements even in dramas
    tense: number;       // Thriller/suspense quotient
    emotional: number;   // Tearjerker factor
    cerebral: number;    // Requires thinking
    escapist: number;    // Pure entertainment
  };

  // PACING
  pacing: {
    slow: number;        // Slow cinema, character studies
    medium: number;      // Standard narrative
    fast: number;        // Quick cuts, action-heavy
    episodic: number;    // Anthology/standalone episodes
    serialized: number;  // Must watch in order
  };

  // THEMES (presence strength 0-1)
  themes: {
    redemption: number;
    revenge: number;
    familyDynamics: number;
    comingOfAge: number;
    goodVsEvil: number;
    survival: number;
    identity: number;
    power: number;
    love: number;
    loss: number;
    technology: number;
    nature: number;
    isolation: number;
    friendship: number;
    betrayal: number;
    justice: number;
  };

  // VISUAL/AESTHETIC
  aesthetic: {
    visuallyStunning: number;  // Cinematography focus
    gritty: number;            // Raw, realistic
    stylized: number;          // Distinct visual style
    animated: number;          // Animation quality
    practicalEffects: number;  // Practical vs CGI
    cgiHeavy: number;
  };

  // NARRATIVE STRUCTURE
  narrative: {
    nonLinear: number;      // Pulp Fiction, Memento
    multiPerspective: number; // Multiple POVs
    unreliableNarrator: number;
    twistEnding: number;
    openEnded: number;
    closedEnding: number;
  };

  // CONTENT SIGNALS
  content: {
    violence: number;       // 0=none, 1=extreme
    sexuality: number;
    language: number;
    frightening: number;
    substanceUse: number;
  };

  // PRODUCTION SIGNALS
  production: {
    budget: 'indie' | 'mid' | 'blockbuster';
    era: 'classic' | 'modern' | 'contemporary';
    originCountry: string[];
    isRemake: boolean;
    isSequel: boolean;
    isAdaptation: boolean;
    sourceType?: 'book' | 'comic' | 'game' | 'original' | 'trueStory';
  };

  // TALENT DNA
  talent: {
    directors: string[];
    writers: string[];
    composers: string[];
    cinematographers: string[];
    leadActors: string[];
    productionCompanies: string[];
  };

  // TMDB ENRICHMENT
  keywords: string[];      // TMDb keywords
  collections: string[];   // Franchise/series
  similarTitles: number[]; // TMDb similar
}

export interface UserDNAProfile {
  // Preferred attributes (aggregated from watchlist)
  tone: ContentDNA['tone'];
  pacing: ContentDNA['pacing'];
  themes: ContentDNA['themes'];
  aesthetic: ContentDNA['aesthetic'];
  narrative: ContentDNA['narrative'];

  // Favorite talent
  favoriteDirectors: { name: string; count: number }[];
  favoriteActors: { name: string; count: number }[];
  favoriteWriters: { name: string; count: number }[];

  // Confidence (0-1)
  confidence: number;
  sampleSize: number;
}

export class ContentDNAService {

  /**
   * Fetch and compute DNA for a title
   */
  async computeDNA(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<ContentDNA> {
    console.log(`[ContentDNA] Computing DNA for ${mediaType} ${tmdbId}...`);

    try {
      // Fetch all available metadata
      const endpoint = mediaType === 'movie' ? '/movie' : '/tv';
      const { data: details } = await tmdbApi.get(`${endpoint}/${tmdbId}`, {
        params: {
          append_to_response: 'keywords,credits,similar',
        },
      });

      // Extract keyword strings
      const keywordData = details.keywords?.keywords || details.keywords?.results || [];
      const keywordStrings = keywordData.map((k: any) => k.name.toLowerCase());

      // Compute all DNA dimensions
      const tone = this.computeTone(details, keywordStrings);
      const themes = this.computeThemes(keywordStrings, details.overview || '');
      const pacing = this.computePacing(details, keywordStrings, mediaType);
      const talent = this.extractTalent(details.credits || {});
      const aesthetic = this.computeAesthetic(details, keywordStrings, talent);
      const narrative = this.computeNarrative(keywordStrings);
      const content = this.computeContentSignals(details, keywordStrings);
      const production = this.computeProductionSignals(details);

      console.log(`[ContentDNA] DNA computed for ${details.title || details.name}`);

      return {
        tmdbId,
        mediaType,
        tone,
        themes,
        pacing,
        aesthetic,
        narrative,
        content,
        production,
        talent,
        keywords: keywordStrings,
        collections: details.belongs_to_collection ? [details.belongs_to_collection.name] : [],
        similarTitles: details.similar?.results?.slice(0, 10).map((s: any) => s.id) || [],
      };
    } catch (error) {
      console.error(`[ContentDNA] Error computing DNA for ${mediaType} ${tmdbId}:`, error);
      throw error;
    }
  }

  private computeTone(details: any, keywords: string[]): ContentDNA['tone'] {
    const genreIds = details.genre_ids || details.genres?.map((g: any) => g.id) || [];

    // Dark signals
    const darkKeywords = ['dark', 'noir', 'dystopia', 'death', 'murder', 'tragedy', 'bleak', 'grim'];
    const darkGenres = [27, 53, 80]; // Horror, Thriller, Crime
    const dark = this.computeSignalStrength(keywords, darkKeywords, genreIds, darkGenres);

    // Humor signals
    const humorKeywords = ['comedy', 'funny', 'satire', 'parody', 'wit', 'humor'];
    const humorGenres = [35]; // Comedy
    const humorous = this.computeSignalStrength(keywords, humorKeywords, genreIds, humorGenres);

    // Tension signals
    const tenseKeywords = ['suspense', 'thriller', 'tension', 'mystery', 'psychological'];
    const tenseGenres = [53, 9648]; // Thriller, Mystery
    const tense = this.computeSignalStrength(keywords, tenseKeywords, genreIds, tenseGenres);

    // Emotional signals
    const emotionalKeywords = ['emotional', 'heartwarming', 'tearjerker', 'poignant', 'bittersweet'];
    const emotionalGenres = [18, 10749]; // Drama, Romance
    const emotional = this.computeSignalStrength(keywords, emotionalKeywords, genreIds, emotionalGenres);

    // Cerebral signals
    const cerebralKeywords = ['philosophical', 'existential', 'thought-provoking', 'complex', 'cerebral'];
    const cerebral = this.computeSignalStrength(keywords, cerebralKeywords, [], []) * 1.5;

    // Escapist signals
    const escapistKeywords = ['adventure', 'fantasy', 'fun', 'entertaining', 'popcorn'];
    const escapistGenres = [12, 14, 878]; // Adventure, Fantasy, Sci-Fi
    const escapist = this.computeSignalStrength(keywords, escapistKeywords, genreIds, escapistGenres);

    return {
      dark: Math.min(1, dark),
      humorous: Math.min(1, humorous),
      tense: Math.min(1, tense),
      emotional: Math.min(1, emotional),
      cerebral: Math.min(1, cerebral),
      escapist: Math.min(1, escapist),
    };
  }

  private computeThemes(keywords: string[], overview: string): ContentDNA['themes'] {
    const text = [...keywords, overview.toLowerCase()].join(' ');

    return {
      redemption: this.themeScore(text, ['redemption', 'second chance', 'forgiveness', 'atonement']),
      revenge: this.themeScore(text, ['revenge', 'vengeance', 'retribution', 'payback']),
      familyDynamics: this.themeScore(text, ['family', 'father', 'mother', 'sibling', 'parent', 'child', 'daughter', 'son']),
      comingOfAge: this.themeScore(text, ['coming of age', 'teenager', 'growing up', 'adolescence', 'youth']),
      goodVsEvil: this.themeScore(text, ['good vs evil', 'hero', 'villain', 'evil', 'darkness']),
      survival: this.themeScore(text, ['survival', 'apocalypse', 'disaster', 'stranded', 'escape']),
      identity: this.themeScore(text, ['identity', 'self-discovery', 'who am i', 'transformation']),
      power: this.themeScore(text, ['power', 'corruption', 'politics', 'empire', 'control']),
      love: this.themeScore(text, ['love', 'romance', 'relationship', 'heart', 'passion']),
      loss: this.themeScore(text, ['loss', 'grief', 'death', 'mourning', 'tragedy']),
      technology: this.themeScore(text, ['technology', 'ai', 'robot', 'computer', 'cyber', 'digital']),
      nature: this.themeScore(text, ['nature', 'environment', 'animal', 'wildlife', 'earth']),
      isolation: this.themeScore(text, ['isolation', 'alone', 'solitude', 'loneliness', 'stranded']),
      friendship: this.themeScore(text, ['friendship', 'friends', 'bond', 'loyalty', 'companion']),
      betrayal: this.themeScore(text, ['betrayal', 'trust', 'deception', 'lie', 'traitor']),
      justice: this.themeScore(text, ['justice', 'law', 'court', 'trial', 'innocent', 'guilty']),
    };
  }

  private computePacing(details: any, keywords: string[], mediaType: 'movie' | 'tv'): ContentDNA['pacing'] {
    const runtime = details.runtime || (mediaType === 'tv' ? 45 : 100);
    const genreIds = details.genre_ids || details.genres?.map((g: any) => g.id) || [];

    const fastGenres = [28, 53]; // Action, Thriller
    const slowGenres = [18, 99, 36]; // Drama, Documentary, History

    if (mediaType === 'tv') {
      return {
        slow: 0.3,
        medium: 0.5,
        fast: genreIds.some((g: number) => fastGenres.includes(g)) ? 0.6 : 0.2,
        episodic: 0.6,
        serialized: 0.7,
      };
    }

    return {
      slow: runtime > 150 ? 0.8 : runtime > 120 && genreIds.some((g: number) => slowGenres.includes(g)) ? 0.6 : 0.2,
      medium: runtime >= 90 && runtime <= 120 ? 0.8 : 0.4,
      fast: runtime < 95 || genreIds.some((g: number) => fastGenres.includes(g)) ? 0.7 : 0.3,
      episodic: 0,
      serialized: 0,
    };
  }

  private computeAesthetic(details: any, keywords: string[], talent: ContentDNA['talent']): ContentDNA['aesthetic'] {
    // Check for visually-focused directors
    const visualDirectors = ['denis villeneuve', 'wes anderson', 'christopher nolan', 'ridley scott', 'terrence malick'];
    const hasVisualDirector = talent.directors.some(d =>
      visualDirectors.some(vd => d.toLowerCase().includes(vd))
    );

    const genreIds = details.genre_ids || details.genres?.map((g: any) => g.id) || [];

    return {
      visuallyStunning: hasVisualDirector ? 0.8 :
        keywords.some(k => ['cinematography', 'beautiful', 'stunning', 'gorgeous'].includes(k)) ? 0.7 : 0.4,
      gritty: this.themeScore(keywords.join(' '), ['gritty', 'realistic', 'raw', 'dark']),
      stylized: this.themeScore(keywords.join(' '), ['stylized', 'unique', 'distinctive', 'artistic']),
      animated: genreIds.includes(16) ? 1.0 : 0,
      practicalEffects: keywords.includes('practical effects') ? 0.8 : 0.3,
      cgiHeavy: genreIds.some((g: number) => [878, 14, 28].includes(g)) ? 0.7 : 0.3,
    };
  }

  private computeNarrative(keywords: string[]): ContentDNA['narrative'] {
    const text = keywords.join(' ');

    return {
      nonLinear: this.themeScore(text, ['nonlinear', 'flashback', 'time loop', 'multiple timelines']),
      multiPerspective: this.themeScore(text, ['multiple perspectives', 'anthology', 'ensemble']),
      unreliableNarrator: this.themeScore(text, ['unreliable narrator', 'deception', 'mystery']),
      twistEnding: this.themeScore(text, ['plot twist', 'surprise ending', 'twist']),
      openEnded: this.themeScore(text, ['open ending', 'ambiguous', 'unclear']),
      closedEnding: 0.6, // Default - most content has closed endings
    };
  }

  private computeContentSignals(details: any, keywords: string[]): ContentDNA['content'] {
    const text = keywords.join(' ');
    const genreIds = details.genre_ids || details.genres?.map((g: any) => g.id) || [];

    return {
      violence: genreIds.some((g: number) => [28, 80, 53, 27].includes(g)) ? 0.7 :
        this.themeScore(text, ['violence', 'gore', 'brutal', 'bloody']),
      sexuality: this.themeScore(text, ['sexuality', 'erotic', 'nudity', 'sex']),
      language: 0.5, // Default moderate
      frightening: genreIds.includes(27) ? 0.8 : this.themeScore(text, ['scary', 'frightening', 'horror', 'terrifying']),
      substanceUse: this.themeScore(text, ['drugs', 'alcohol', 'addiction', 'substance']),
    };
  }

  private computeProductionSignals(details: any): ContentDNA['production'] {
    const budget = details.budget || 0;
    const releaseYear = details.release_date ? new Date(details.release_date).getFullYear() :
      details.first_air_date ? new Date(details.first_air_date).getFullYear() : new Date().getFullYear();

    const currentYear = new Date().getFullYear();

    return {
      budget: budget > 100_000_000 ? 'blockbuster' : budget > 20_000_000 ? 'mid' : 'indie',
      era: releaseYear >= currentYear - 5 ? 'contemporary' :
           releaseYear >= 2000 ? 'modern' : 'classic',
      originCountry: details.origin_country || details.production_countries?.map((c: any) => c.iso_3166_1) || [],
      isRemake: details.keywords?.keywords?.some((k: any) => k.name.toLowerCase().includes('remake')) || false,
      isSequel: details.belongs_to_collection !== null ||
        (details.title || details.name || '').match(/\b(2|3|II|III|IV|sequel)\b/i) !== null,
      isAdaptation: details.keywords?.keywords?.some((k: any) =>
        ['based on novel', 'based on comic', 'adaptation'].some(term => k.name.toLowerCase().includes(term))
      ) || false,
    };
  }

  private extractTalent(credits: any): ContentDNA['talent'] {
    const crew = credits.crew || [];
    const cast = credits.cast || [];

    return {
      directors: crew.filter((c: any) => c.job === 'Director').map((c: any) => c.name).slice(0, 3),
      writers: crew.filter((c: any) => ['Writer', 'Screenplay'].includes(c.job)).map((c: any) => c.name).slice(0, 3),
      composers: crew.filter((c: any) => c.job === 'Original Music Composer').map((c: any) => c.name).slice(0, 2),
      cinematographers: crew.filter((c: any) => c.job === 'Director of Photography').map((c: any) => c.name).slice(0, 2),
      leadActors: cast.slice(0, 5).map((c: any) => c.name),
      productionCompanies: [],
    };
  }

  /**
   * Compute DNA similarity between two pieces of content
   */
  computeSimilarity(dna1: ContentDNA, dna2: ContentDNA): number {
    let totalScore = 0;
    let totalWeight = 0;

    // Tone similarity (weight: 25%)
    const toneScore = this.vectorSimilarity(
      Object.values(dna1.tone),
      Object.values(dna2.tone)
    );
    totalScore += toneScore * 0.25;
    totalWeight += 0.25;

    // Theme similarity (weight: 30%)
    const themeScore = this.vectorSimilarity(
      Object.values(dna1.themes),
      Object.values(dna2.themes)
    );
    totalScore += themeScore * 0.30;
    totalWeight += 0.30;

    // Talent overlap (weight: 20%)
    const talentScore = this.talentOverlap(dna1.talent, dna2.talent);
    totalScore += talentScore * 0.20;
    totalWeight += 0.20;

    // Keyword overlap (weight: 15%)
    const keywordScore = this.setOverlap(dna1.keywords, dna2.keywords);
    totalScore += keywordScore * 0.15;
    totalWeight += 0.15;

    // Pacing similarity (weight: 10%)
    const pacingScore = this.vectorSimilarity(
      Object.values(dna1.pacing),
      Object.values(dna2.pacing)
    );
    totalScore += pacingScore * 0.10;
    totalWeight += 0.10;

    return totalScore / totalWeight;
  }

  // Helper methods

  private themeScore(text: string, themeWords: string[]): number {
    const matches = themeWords.filter(word => text.includes(word)).length;
    return Math.min(1, matches / Math.max(2, themeWords.length * 0.4));
  }

  private computeSignalStrength(
    keywords: string[],
    targetKeywords: string[],
    genreIds: number[],
    targetGenres: number[]
  ): number {
    const keywordMatches = targetKeywords.filter(tk =>
      keywords.some(k => k.includes(tk))
    ).length;

    const genreMatches = targetGenres.filter(tg => genreIds.includes(tg)).length;

    const keywordScore = keywordMatches / Math.max(1, targetKeywords.length);
    const genreScore = genreMatches / Math.max(1, targetGenres.length);

    return (keywordScore * 0.6) + (genreScore * 0.4);
  }

  private vectorSimilarity(v1: number[], v2: number[]): number {
    // Cosine similarity
    const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
    const mag1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));

    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (mag1 * mag2);
  }

  private talentOverlap(t1: ContentDNA['talent'], t2: ContentDNA['talent']): number {
    let score = 0;

    // Director match is very significant
    const directorMatch = t1.directors.some(d => t2.directors.includes(d));
    if (directorMatch) score += 0.4;

    // Actor overlap
    const actorOverlap = t1.leadActors.filter(a => t2.leadActors.includes(a)).length;
    score += Math.min(0.3, actorOverlap * 0.1);

    // Writer overlap
    const writerMatch = t1.writers.some(w => t2.writers.includes(w));
    if (writerMatch) score += 0.2;

    // Composer match
    const composerMatch = t1.composers.some(c => t2.composers.includes(c));
    if (composerMatch) score += 0.1;

    return Math.min(1, score);
  }

  private setOverlap(s1: string[], s2: string[]): number {
    const set1 = new Set(s1);
    const set2 = new Set(s2);
    const intersection = [...set1].filter(x => set2.has(x)).length;
    const union = new Set([...s1, ...s2]).size;
    return union > 0 ? intersection / union : 0;
  }
}

// Export singleton instance
export const contentDNAService = new ContentDNAService();

/**
 * Legacy function - kept for backward compatibility
 * New code should use contentDNAService.computeDNA() instead
 */
export const buildUserDNAProfile = async (userId: string): Promise<UserDNAProfile | null> => {
  console.log('[ContentDNA] Legacy buildUserDNAProfile called - returning null');
  console.log('[ContentDNA] Use contentDNAService.computeDNA() for new DNA extraction');
  return null;
};
