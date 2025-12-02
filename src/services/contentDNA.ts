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
import { batchFetchDetails } from '@/services/tmdbBatch';
import { PerformanceTimer } from '@/utils/performance';

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

/**
 * Comprehensive User Taste Profile
 * Goes beyond genre affinity to build a complete picture of user preferences
 */
export interface UserTasteProfile {
  userId: string;

  // Aggregated DNA preferences (learned from watched content)
  preferredTone: ContentDNA['tone'];
  preferredThemes: ContentDNA['themes'];
  preferredPacing: ContentDNA['pacing'];
  preferredAesthetic: ContentDNA['aesthetic'];
  preferredNarrative: ContentDNA['narrative'];

  // Explicit preferences
  favoriteDirectors: Array<{ name: string; score: number }>;
  favoriteActors: Array<{ name: string; score: number }>;
  favoriteWriters: Array<{ name: string; score: number }>;
  favoriteDecades: Array<{ decade: string; score: number }>;
  favoriteOrigins: Array<{ country: string; score: number }>;

  // Content tolerance
  violenceTolerance: number;
  complexityPreference: number;

  // Viewing patterns
  patterns: {
    preferredLength: 'short' | 'medium' | 'long' | 'any';
    bingeVsEpisodic: number; // 0=episodic, 1=binge
    newVsClassic: number;    // 0=classics, 1=new releases
    mainstreamVsNiche: number; // 0=mainstream, 1=niche
    movieVsTv: number;       // 0=movies, 1=TV
  };

  // Interest graph
  interestClusters: Array<{
    name: string;           // "Christopher Nolan Mind-Benders"
    seedContent: number[];  // TMDb IDs that define this cluster
    strength: number;       // How strong is this interest
  }>;

  // Anti-preferences (what to avoid)
  avoidGenres: number[];
  avoidKeywords: string[];
  avoidThemes: string[];

  // Exploration appetite
  explorationScore: number; // 0=stick to comfort zone, 1=adventurous

  // Temporal preferences
  timeBasedPreferences: {
    weekdayEvening: string[];   // Genres/moods for weekday evenings
    weekendAfternoon: string[];
    lateNight: string[];
  };

  // Computed meta-insights
  tasteSignature: string;    // "Dark Thriller Enthusiast with Animation Soft Spot"
  discoveryOpportunities: string[]; // Adjacent genres not yet explored

  // Confidence metrics
  confidence: number; // 0-1
  sampleSize: number; // Number of items in profile
  lastUpdated: Date;
}

/**
 * Legacy interface - kept for backward compatibility
 */
export interface UserDNAProfile {
  tone: ContentDNA['tone'];
  pacing: ContentDNA['pacing'];
  themes: ContentDNA['themes'];
  aesthetic: ContentDNA['aesthetic'];
  narrative: ContentDNA['narrative'];
  favoriteDirectors: { name: string; count: number }[];
  favoriteActors: { name: string; count: number }[];
  favoriteWriters: { name: string; count: number }[];
  confidence: number;
  sampleSize: number;
}

export class ContentDNAService {

  /**
   * Fetch and compute DNA for a title
   * @param tmdbId - TMDb ID
   * @param mediaType - 'movie' or 'tv'
   * @param prefetchedData - Optional pre-fetched data from batch operations (for performance)
   */
  async computeDNA(
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    prefetchedData?: {
      keywords: { id: number; name: string }[];
      credits: {
        cast: { id: number; name: string; character: string; order: number }[];
        crew: { id: number; name: string; job: string; department: string }[];
      };
      genres: { id: number; name: string }[];
      vote_average: number;
      vote_count: number;
      popularity: number;
      runtime?: number;
      episode_run_time?: number[];
    }
  ): Promise<ContentDNA> {
    const timer = new PerformanceTimer('DNA computation', { tmdbId, mediaType });

    try {
      let details: any;
      let keywordData: any[];
      let credits: any;

      if (prefetchedData) {
        // Use pre-fetched data (from batch operations)
        console.log(`[ContentDNA] Using pre-fetched data for ${mediaType} ${tmdbId}`);
        details = {
          genres: prefetchedData.genres,
          vote_average: prefetchedData.vote_average,
          vote_count: prefetchedData.vote_count,
          popularity: prefetchedData.popularity,
          runtime: prefetchedData.runtime,
          episode_run_time: prefetchedData.episode_run_time,
          keywords: { keywords: prefetchedData.keywords, results: prefetchedData.keywords },
          overview: '', // Not critical for DNA computation
        };
        keywordData = prefetchedData.keywords;
        credits = prefetchedData.credits;
      } else {
        // Fetch all available metadata
        console.log(`[ContentDNA] Fetching metadata for ${mediaType} ${tmdbId}...`);
        const endpoint = mediaType === 'movie' ? '/movie' : '/tv';
        const { data } = await tmdbApi.get(`${endpoint}/${tmdbId}`, {
          params: {
            append_to_response: 'keywords,credits,similar',
          },
        });
        details = data;
        keywordData = details.keywords?.keywords || details.keywords?.results || [];
        credits = details.credits || {};
      }

      // Extract keyword strings
      const keywordStrings = keywordData.map((k: any) => k.name?.toLowerCase() || '');

      // Compute all DNA dimensions
      const tone = this.computeTone(details, keywordStrings);
      const themes = this.computeThemes(keywordStrings, details.overview || '');
      const pacing = this.computePacing(details, keywordStrings, mediaType);
      const talent = this.extractTalent(credits);
      const aesthetic = this.computeAesthetic(details, keywordStrings, talent);
      const narrative = this.computeNarrative(keywordStrings);
      const content = this.computeContentSignals(details, keywordStrings);
      const production = this.computeProductionSignals(details);

      timer.end();

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
      timer.end();
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

  /**
   * Build comprehensive taste profile from user's watchlist
   */
  async buildUserTasteProfile(userId: string): Promise<UserTasteProfile | null> {
    console.log(`[TasteProfile] Building taste profile for user ${userId}...`);

    try {
      // Fetch user's watchlist items
      const { data: watchlistItems, error } = await supabase
        .from('watchlist_items')
        .select('tmdb_id, media_type, status, rating, created_at')
        .eq('user_id', userId)
        .in('status', ['watched', 'watching']) // Only items they've engaged with
        .not('tmdb_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100); // Analyze last 100 items

      if (error) throw error;
      if (!watchlistItems || watchlistItems.length === 0) {
        console.log('[TasteProfile] No watchlist items found');
        return null;
      }

      console.log(`[TasteProfile] Analyzing ${watchlistItems.length} watchlist items...`);

      // PERFORMANCE OPTIMIZATION: Batch fetch all TMDb data in parallel
      const timer = new PerformanceTimer('Taste profile build', { itemCount: watchlistItems.length });

      console.log(`[TasteProfile] Batch fetching TMDb data for ${watchlistItems.length} items...`);
      const batchItems = watchlistItems.map(item => ({
        tmdbId: item.tmdb_id,
        mediaType: (item.media_type === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv',
      }));

      const batchResults = await batchFetchDetails(batchItems, 10); // Fetch 10 items in parallel
      console.log(`[TasteProfile] Batch fetch complete, computing DNA for ${batchResults.length} items...`);

      // Compute DNA for all watchlist items with weights
      const weightedProfiles: Array<{ dna: ContentDNA; weight: number }> = [];
      const dnaMap = new Map<number, ContentDNA>();

      for (const item of watchlistItems) {
        try {
          const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';

          // Find pre-fetched data for this item
          const batchResult = batchResults.find(r => r.tmdbId === item.tmdb_id && r.mediaType === mediaType);

          // Compute DNA using pre-fetched data (if available)
          const dna = await this.computeDNA(
            item.tmdb_id,
            mediaType,
            batchResult?.details || undefined
          );

          // Calculate weight based on recency, rating, and completion
          const weight = this.calculateItemWeight(item);

          weightedProfiles.push({ dna, weight });
          dnaMap.set(item.tmdb_id, dna);
        } catch (error) {
          console.warn(`[TasteProfile] Failed to compute DNA for ${item.tmdb_id}:`, error);
        }
      }

      timer.end();

      if (weightedProfiles.length === 0) {
        console.log('[TasteProfile] No DNA profiles computed');
        return null;
      }

      console.log(`[TasteProfile] Computed ${weightedProfiles.length} weighted DNA profiles`);

      // Build taste profile with weighted aggregation
      const profile: UserTasteProfile = {
        userId,
        preferredTone: this.aggregateToneWeighted(weightedProfiles),
        preferredThemes: this.aggregateThemesWeighted(weightedProfiles),
        preferredPacing: this.aggregatePacingWeighted(weightedProfiles),
        preferredAesthetic: this.aggregateAestheticWeighted(weightedProfiles),
        preferredNarrative: this.aggregateNarrativeWeighted(weightedProfiles),
        favoriteDirectors: this.computeFavoriteDirectorsWeighted(weightedProfiles),
        favoriteActors: this.computeFavoriteActorsWeighted(weightedProfiles),
        favoriteWriters: this.computeFavoriteWritersWeighted(weightedProfiles),
        favoriteDecades: this.computeFavoriteDecadesWeighted(weightedProfiles),
        favoriteOrigins: this.computeFavoriteOriginsWeighted(weightedProfiles),
        violenceTolerance: this.computeViolenceToleranceWeighted(weightedProfiles),
        complexityPreference: this.computeComplexityPreferenceWeighted(weightedProfiles),
        patterns: this.computeViewingPatterns(weightedProfiles.map(wp => wp.dna), watchlistItems),
        interestClusters: this.detectInterestClustersTemplate(watchlistItems, dnaMap),
        avoidGenres: [], // TODO: Implement anti-preference detection
        avoidKeywords: [],
        avoidThemes: [],
        explorationScore: this.computeExplorationScore(weightedProfiles.map(wp => wp.dna)),
        timeBasedPreferences: {
          weekdayEvening: [],
          weekendAfternoon: [],
          lateNight: [],
        },
        tasteSignature: this.computeTasteSignatureEnhanced(weightedProfiles, watchlistItems, dnaMap),
        discoveryOpportunities: this.findDiscoveryOpportunitiesEnhanced(watchlistItems, weightedProfiles),
        confidence: Math.min(1, weightedProfiles.length / 50),
        sampleSize: weightedProfiles.length,
        lastUpdated: new Date(),
      };

      console.log('[TasteProfile] Profile built successfully');
      console.log('[TasteProfile] Taste Signature:', profile.tasteSignature);
      console.log('[TasteProfile] Discovery Opportunities:', profile.discoveryOpportunities);

      return profile;
    } catch (error) {
      console.error('[TasteProfile] Error building taste profile:', error);
      return null;
    }
  }

  private aggregateTone(profiles: ContentDNA[]): ContentDNA['tone'] {
    const avg = {
      dark: 0,
      humorous: 0,
      tense: 0,
      emotional: 0,
      cerebral: 0,
      escapist: 0,
    };

    profiles.forEach(p => {
      avg.dark += p.tone.dark;
      avg.humorous += p.tone.humorous;
      avg.tense += p.tone.tense;
      avg.emotional += p.tone.emotional;
      avg.cerebral += p.tone.cerebral;
      avg.escapist += p.tone.escapist;
    });

    const count = profiles.length;
    return {
      dark: avg.dark / count,
      humorous: avg.humorous / count,
      tense: avg.tense / count,
      emotional: avg.emotional / count,
      cerebral: avg.cerebral / count,
      escapist: avg.escapist / count,
    };
  }

  private aggregateThemes(profiles: ContentDNA[]): ContentDNA['themes'] {
    const avg = {
      redemption: 0, revenge: 0, familyDynamics: 0, comingOfAge: 0,
      goodVsEvil: 0, survival: 0, identity: 0, power: 0,
      love: 0, loss: 0, technology: 0, nature: 0,
      isolation: 0, friendship: 0, betrayal: 0, justice: 0,
    };

    profiles.forEach(p => {
      Object.keys(avg).forEach(key => {
        avg[key as keyof typeof avg] += p.themes[key as keyof typeof p.themes];
      });
    });

    const count = profiles.length;
    Object.keys(avg).forEach(key => {
      avg[key as keyof typeof avg] /= count;
    });

    return avg;
  }

  private aggregatePacing(profiles: ContentDNA[]): ContentDNA['pacing'] {
    const avg = { slow: 0, medium: 0, fast: 0, episodic: 0, serialized: 0 };

    profiles.forEach(p => {
      avg.slow += p.pacing.slow;
      avg.medium += p.pacing.medium;
      avg.fast += p.pacing.fast;
      avg.episodic += p.pacing.episodic;
      avg.serialized += p.pacing.serialized;
    });

    const count = profiles.length;
    return {
      slow: avg.slow / count,
      medium: avg.medium / count,
      fast: avg.fast / count,
      episodic: avg.episodic / count,
      serialized: avg.serialized / count,
    };
  }

  private aggregateAesthetic(profiles: ContentDNA[]): ContentDNA['aesthetic'] {
    const avg = {
      visuallyStunning: 0, gritty: 0, stylized: 0,
      animated: 0, practicalEffects: 0, cgiHeavy: 0,
    };

    profiles.forEach(p => {
      avg.visuallyStunning += p.aesthetic.visuallyStunning;
      avg.gritty += p.aesthetic.gritty;
      avg.stylized += p.aesthetic.stylized;
      avg.animated += p.aesthetic.animated;
      avg.practicalEffects += p.aesthetic.practicalEffects;
      avg.cgiHeavy += p.aesthetic.cgiHeavy;
    });

    const count = profiles.length;
    return {
      visuallyStunning: avg.visuallyStunning / count,
      gritty: avg.gritty / count,
      stylized: avg.stylized / count,
      animated: avg.animated / count,
      practicalEffects: avg.practicalEffects / count,
      cgiHeavy: avg.cgiHeavy / count,
    };
  }

  private aggregateNarrative(profiles: ContentDNA[]): ContentDNA['narrative'] {
    const avg = {
      nonLinear: 0, multiPerspective: 0, unreliableNarrator: 0,
      twistEnding: 0, openEnded: 0, closedEnding: 0,
    };

    profiles.forEach(p => {
      avg.nonLinear += p.narrative.nonLinear;
      avg.multiPerspective += p.narrative.multiPerspective;
      avg.unreliableNarrator += p.narrative.unreliableNarrator;
      avg.twistEnding += p.narrative.twistEnding;
      avg.openEnded += p.narrative.openEnded;
      avg.closedEnding += p.narrative.closedEnding;
    });

    const count = profiles.length;
    return {
      nonLinear: avg.nonLinear / count,
      multiPerspective: avg.multiPerspective / count,
      unreliableNarrator: avg.unreliableNarrator / count,
      twistEnding: avg.twistEnding / count,
      openEnded: avg.openEnded / count,
      closedEnding: avg.closedEnding / count,
    };
  }

  private computeFavoriteDirectors(profiles: ContentDNA[]): Array<{ name: string; score: number }> {
    const directorCounts = new Map<string, number>();

    profiles.forEach(p => {
      p.talent.directors.forEach(director => {
        directorCounts.set(director, (directorCounts.get(director) || 0) + 1);
      });
    });

    return Array.from(directorCounts.entries())
      .map(([name, count]) => ({
        name,
        score: count / profiles.length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  private computeFavoriteActors(profiles: ContentDNA[]): Array<{ name: string; score: number }> {
    const actorCounts = new Map<string, number>();

    profiles.forEach(p => {
      p.talent.leadActors.forEach(actor => {
        actorCounts.set(actor, (actorCounts.get(actor) || 0) + 1);
      });
    });

    return Array.from(actorCounts.entries())
      .map(([name, count]) => ({
        name,
        score: count / profiles.length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  private computeFavoriteWriters(profiles: ContentDNA[]): Array<{ name: string; score: number }> {
    const writerCounts = new Map<string, number>();

    profiles.forEach(p => {
      p.talent.writers.forEach(writer => {
        writerCounts.set(writer, (writerCounts.get(writer) || 0) + 1);
      });
    });

    return Array.from(writerCounts.entries())
      .map(([name, count]) => ({
        name,
        score: count / profiles.length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  private computeFavoriteDecades(profiles: ContentDNA[]): Array<{ decade: string; score: number }> {
    const decadeCounts = new Map<string, number>();

    profiles.forEach(p => {
      const era = p.production.era;
      let decade = 'Unknown';

      if (era === 'contemporary') decade = '2020s';
      else if (era === 'modern') decade = '2000s-2010s';
      else if (era === 'classic') decade = 'Pre-2000';

      decadeCounts.set(decade, (decadeCounts.get(decade) || 0) + 1);
    });

    return Array.from(decadeCounts.entries())
      .map(([decade, count]) => ({
        decade,
        score: count / profiles.length,
      }))
      .sort((a, b) => b.score - a.score);
  }

  private computeFavoriteOrigins(profiles: ContentDNA[]): Array<{ country: string; score: number }> {
    const countryCounts = new Map<string, number>();

    profiles.forEach(p => {
      p.production.originCountry.forEach(country => {
        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
      });
    });

    return Array.from(countryCounts.entries())
      .map(([country, count]) => ({
        country,
        score: count / profiles.length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private computeViolenceTolerance(profiles: ContentDNA[]): number {
    const avgViolence = profiles.reduce((sum, p) => sum + p.content.violence, 0) / profiles.length;
    return avgViolence;
  }

  private computeComplexityPreference(profiles: ContentDNA[]): number {
    const cerebralScore = profiles.reduce((sum, p) => sum + p.tone.cerebral, 0) / profiles.length;
    const nonLinearScore = profiles.reduce((sum, p) => sum + p.narrative.nonLinear, 0) / profiles.length;
    return (cerebralScore + nonLinearScore) / 2;
  }

  private computeViewingPatterns(profiles: ContentDNA[], watchlistItems: any[]): UserTasteProfile['patterns'] {
    // Movie vs TV preference
    const movieCount = profiles.filter(p => p.mediaType === 'movie').length;
    const tvCount = profiles.filter(p => p.mediaType === 'tv').length;
    const movieVsTv = tvCount / Math.max(1, movieCount + tvCount);

    // Binge vs Episodic
    const bingeScore = profiles.reduce((sum, p) => sum + p.pacing.serialized, 0) / profiles.length;

    // New vs Classic
    const newCount = profiles.filter(p => p.production.era === 'contemporary').length;
    const classicCount = profiles.filter(p => p.production.era === 'classic').length;
    const newVsClassic = newCount / Math.max(1, newCount + classicCount);

    // Mainstream vs Niche (based on budget)
    const blockbusterCount = profiles.filter(p => p.production.budget === 'blockbuster').length;
    const indieCount = profiles.filter(p => p.production.budget === 'indie').length;
    const mainstreamVsNiche = indieCount / Math.max(1, blockbusterCount + indieCount);

    return {
      preferredLength: 'any', // TODO: Implement runtime analysis
      bingeVsEpisodic: bingeScore,
      newVsClassic,
      mainstreamVsNiche,
      movieVsTv,
    };
  }

  private detectInterestClusters(profiles: ContentDNA[]): UserTasteProfile['interestClusters'] {
    const clusters: UserTasteProfile['interestClusters'] = [];

    // Director-based clusters
    const directorGroups = new Map<string, number[]>();
    profiles.forEach(p => {
      p.talent.directors.forEach(director => {
        if (!directorGroups.has(director)) {
          directorGroups.set(director, []);
        }
        directorGroups.get(director)!.push(p.tmdbId);
      });
    });

    // Create clusters for directors with 2+ works
    directorGroups.forEach((tmdbIds, director) => {
      if (tmdbIds.length >= 2) {
        clusters.push({
          name: `${director} Films`,
          seedContent: tmdbIds,
          strength: tmdbIds.length / profiles.length,
        });
      }
    });

    // Theme-based clusters
    const themeEntries = Object.entries(this.aggregateThemes(profiles))
      .filter(([_, score]) => score > 0.3)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3);

    themeEntries.forEach(([theme, score]) => {
      const relatedContent = profiles
        .filter(p => p.themes[theme as keyof ContentDNA['themes']] > 0.3)
        .map(p => p.tmdbId);

      if (relatedContent.length >= 3) {
        const themeName = theme.replace(/([A-Z])/g, ' $1').trim();
        clusters.push({
          name: `${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Stories`,
          seedContent: relatedContent,
          strength: score,
        });
      }
    });

    return clusters.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  private computeExplorationScore(profiles: ContentDNA[]): number {
    // Measure diversity across different dimensions
    const toneVariance = this.computeVariance(profiles.map(p => Object.values(p.tone)));
    const themeVariance = this.computeVariance(profiles.map(p => Object.values(p.themes)));

    // High variance = more exploratory
    // Low variance = sticks to comfort zone
    return Math.min(1, (toneVariance + themeVariance) / 2);
  }

  private computeVariance(vectors: number[][]): number {
    if (vectors.length === 0) return 0;

    // Compute mean vector
    const dimensions = vectors[0].length;
    const mean = new Array(dimensions).fill(0);
    vectors.forEach(v => {
      v.forEach((val, i) => mean[i] += val);
    });
    mean.forEach((_, i) => mean[i] /= vectors.length);

    // Compute variance
    let variance = 0;
    vectors.forEach(v => {
      v.forEach((val, i) => {
        variance += Math.pow(val - mean[i], 2);
      });
    });

    return variance / (vectors.length * dimensions);
  }

  private computeTasteSignature(profiles: ContentDNA[]): string {
    const tone = this.aggregateTone(profiles);
    const themes = this.aggregateThemes(profiles);
    const aesthetic = this.aggregateAesthetic(profiles);

    const parts: string[] = [];

    // Dominant tone
    const dominantTone = Object.entries(tone)
      .sort(([_, a], [__, b]) => b - a)[0];
    if (dominantTone[1] > 0.4) {
      parts.push(dominantTone[0].charAt(0).toUpperCase() + dominantTone[0].slice(1));
    }

    // Dominant theme
    const dominantTheme = Object.entries(themes)
      .sort(([_, a], [__, b]) => b - a)[0];
    if (dominantTheme[1] > 0.3) {
      const themeName = dominantTheme[0].replace(/([A-Z])/g, ' $1').trim();
      parts.push(themeName.charAt(0).toUpperCase() + themeName.slice(1));
    }

    // Aesthetic preference
    if (aesthetic.visuallyStunning > 0.6) {
      parts.push('Visual');
    } else if (aesthetic.gritty > 0.6) {
      parts.push('Gritty');
    } else if (aesthetic.animated > 0.4) {
      parts.push('Animation');
    }

    // Content type
    const movieCount = profiles.filter(p => p.mediaType === 'movie').length;
    const tvCount = profiles.filter(p => p.mediaType === 'tv').length;
    if (movieCount > tvCount * 2) {
      parts.push('Movie Enthusiast');
    } else if (tvCount > movieCount * 2) {
      parts.push('Series Watcher');
    } else {
      parts.push('Enthusiast');
    }

    return parts.join(' ') || 'Eclectic Viewer';
  }

  private findDiscoveryOpportunities(profiles: ContentDNA[]): string[] {
    const opportunities: string[] = [];

    const tone = this.aggregateTone(profiles);
    const themes = this.aggregateThemes(profiles);

    // Find unexplored tones
    const lowTones = Object.entries(tone)
      .filter(([_, score]) => score < 0.2)
      .map(([name]) => name);

    if (lowTones.includes('humorous') && tone.dark > 0.5) {
      opportunities.push('Dark Comedies - blend your love of dark content with humor');
    }

    if (lowTones.includes('cerebral') && tone.escapist > 0.5) {
      opportunities.push('Thought-provoking Sci-Fi - add intellectual depth to your escapist favorites');
    }

    // Find unexplored themes
    const lowThemes = Object.entries(themes)
      .filter(([_, score]) => score < 0.2)
      .map(([name]) => name);

    if (lowThemes.includes('comingOfAge')) {
      opportunities.push('Coming-of-age stories - unexplored territory for you');
    }

    if (lowThemes.includes('nature')) {
      opportunities.push('Nature documentaries and environmental stories');
    }

    // Era-based opportunities
    const eras = profiles.map(p => p.production.era);
    if (!eras.includes('classic')) {
      opportunities.push('Classic cinema from the Golden Age');
    }

    return opportunities.slice(0, 5);
  }

  /**
   * Calculate weight for a watchlist item based on recency, rating, and completion
   */
  private calculateItemWeight(item: any): number {
    const now = Date.now();
    let weight = 1;

    // Base weight from rating
    if (item.rating && item.rating > 0) {
      weight = item.rating / 3; // 5-star = 1.67x, 1-star = 0.33x
    }

    // Recency boost (items from last 30 days get 1.5x)
    const daysSinceWatch = (now - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceWatch < 30) {
      weight *= 1.5;
    } else if (daysSinceWatch < 90) {
      weight *= 1.2;
    }

    // Completion bonus (watched > watching > want_to_watch)
    if (item.status === 'watched') {
      weight *= 1.3;
    } else if (item.status === 'watching') {
      weight *= 1.1;
    }

    return weight;
  }

  /**
   * Weighted aggregation methods
   */
  private aggregateToneWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): ContentDNA['tone'] {
    const weighted = { dark: 0, humorous: 0, tense: 0, emotional: 0, cerebral: 0, escapist: 0 };
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      weighted.dark += dna.tone.dark * weight;
      weighted.humorous += dna.tone.humorous * weight;
      weighted.tense += dna.tone.tense * weight;
      weighted.emotional += dna.tone.emotional * weight;
      weighted.cerebral += dna.tone.cerebral * weight;
      weighted.escapist += dna.tone.escapist * weight;
      totalWeight += weight;
    });

    return {
      dark: weighted.dark / totalWeight,
      humorous: weighted.humorous / totalWeight,
      tense: weighted.tense / totalWeight,
      emotional: weighted.emotional / totalWeight,
      cerebral: weighted.cerebral / totalWeight,
      escapist: weighted.escapist / totalWeight,
    };
  }

  private aggregateThemesWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): ContentDNA['themes'] {
    const weighted = {
      redemption: 0, revenge: 0, familyDynamics: 0, comingOfAge: 0,
      goodVsEvil: 0, survival: 0, identity: 0, power: 0,
      love: 0, loss: 0, technology: 0, nature: 0,
      isolation: 0, friendship: 0, betrayal: 0, justice: 0,
    };
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      Object.keys(weighted).forEach(key => {
        weighted[key as keyof typeof weighted] += dna.themes[key as keyof typeof dna.themes] * weight;
      });
      totalWeight += weight;
    });

    Object.keys(weighted).forEach(key => {
      weighted[key as keyof typeof weighted] /= totalWeight;
    });

    return weighted;
  }

  private aggregatePacingWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): ContentDNA['pacing'] {
    const weighted = { slow: 0, medium: 0, fast: 0, episodic: 0, serialized: 0 };
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      weighted.slow += dna.pacing.slow * weight;
      weighted.medium += dna.pacing.medium * weight;
      weighted.fast += dna.pacing.fast * weight;
      weighted.episodic += dna.pacing.episodic * weight;
      weighted.serialized += dna.pacing.serialized * weight;
      totalWeight += weight;
    });

    return {
      slow: weighted.slow / totalWeight,
      medium: weighted.medium / totalWeight,
      fast: weighted.fast / totalWeight,
      episodic: weighted.episodic / totalWeight,
      serialized: weighted.serialized / totalWeight,
    };
  }

  private aggregateAestheticWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): ContentDNA['aesthetic'] {
    const weighted = {
      visuallyStunning: 0, gritty: 0, stylized: 0,
      animated: 0, practicalEffects: 0, cgiHeavy: 0,
    };
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      weighted.visuallyStunning += dna.aesthetic.visuallyStunning * weight;
      weighted.gritty += dna.aesthetic.gritty * weight;
      weighted.stylized += dna.aesthetic.stylized * weight;
      weighted.animated += dna.aesthetic.animated * weight;
      weighted.practicalEffects += dna.aesthetic.practicalEffects * weight;
      weighted.cgiHeavy += dna.aesthetic.cgiHeavy * weight;
      totalWeight += weight;
    });

    return {
      visuallyStunning: weighted.visuallyStunning / totalWeight,
      gritty: weighted.gritty / totalWeight,
      stylized: weighted.stylized / totalWeight,
      animated: weighted.animated / totalWeight,
      practicalEffects: weighted.practicalEffects / totalWeight,
      cgiHeavy: weighted.cgiHeavy / totalWeight,
    };
  }

  private aggregateNarrativeWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): ContentDNA['narrative'] {
    const weighted = {
      nonLinear: 0, multiPerspective: 0, unreliableNarrator: 0,
      twistEnding: 0, openEnded: 0, closedEnding: 0,
    };
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      weighted.nonLinear += dna.narrative.nonLinear * weight;
      weighted.multiPerspective += dna.narrative.multiPerspective * weight;
      weighted.unreliableNarrator += dna.narrative.unreliableNarrator * weight;
      weighted.twistEnding += dna.narrative.twistEnding * weight;
      weighted.openEnded += dna.narrative.openEnded * weight;
      weighted.closedEnding += dna.narrative.closedEnding * weight;
      totalWeight += weight;
    });

    return {
      nonLinear: weighted.nonLinear / totalWeight,
      multiPerspective: weighted.multiPerspective / totalWeight,
      unreliableNarrator: weighted.unreliableNarrator / totalWeight,
      twistEnding: weighted.twistEnding / totalWeight,
      openEnded: weighted.openEnded / totalWeight,
      closedEnding: weighted.closedEnding / totalWeight,
    };
  }

  private computeFavoriteDirectorsWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): Array<{ name: string; score: number }> {
    const directorScores = new Map<string, number>();
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      dna.talent.directors.forEach(director => {
        directorScores.set(director, (directorScores.get(director) || 0) + weight);
      });
      totalWeight += weight;
    });

    return Array.from(directorScores.entries())
      .map(([name, score]) => ({ name, score: score / totalWeight }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  private computeFavoriteActorsWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): Array<{ name: string; score: number }> {
    const actorScores = new Map<string, number>();
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      dna.talent.leadActors.forEach(actor => {
        actorScores.set(actor, (actorScores.get(actor) || 0) + weight);
      });
      totalWeight += weight;
    });

    return Array.from(actorScores.entries())
      .map(([name, score]) => ({ name, score: score / totalWeight }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  private computeFavoriteWritersWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): Array<{ name: string; score: number }> {
    const writerScores = new Map<string, number>();
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      dna.talent.writers.forEach(writer => {
        writerScores.set(writer, (writerScores.get(writer) || 0) + weight);
      });
      totalWeight += weight;
    });

    return Array.from(writerScores.entries())
      .map(([name, score]) => ({ name, score: score / totalWeight }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  private computeFavoriteDecadesWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): Array<{ decade: string; score: number }> {
    const decadeScores = new Map<string, number>();
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      const era = dna.production.era;
      let decade = 'Unknown';
      if (era === 'contemporary') decade = '2020s';
      else if (era === 'modern') decade = '2000s-2010s';
      else if (era === 'classic') decade = 'Pre-2000';

      decadeScores.set(decade, (decadeScores.get(decade) || 0) + weight);
      totalWeight += weight;
    });

    return Array.from(decadeScores.entries())
      .map(([decade, score]) => ({ decade, score: score / totalWeight }))
      .sort((a, b) => b.score - a.score);
  }

  private computeFavoriteOriginsWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): Array<{ country: string; score: number }> {
    const countryScores = new Map<string, number>();
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      dna.production.originCountry.forEach(country => {
        countryScores.set(country, (countryScores.get(country) || 0) + weight);
      });
      totalWeight += weight;
    });

    return Array.from(countryScores.entries())
      .map(([country, score]) => ({ country, score: score / totalWeight }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private computeViolenceToleranceWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): number {
    let totalViolence = 0;
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      totalViolence += dna.content.violence * weight;
      totalWeight += weight;
    });

    return totalViolence / totalWeight;
  }

  private computeComplexityPreferenceWeighted(profiles: Array<{ dna: ContentDNA; weight: number }>): number {
    let totalComplexity = 0;
    let totalWeight = 0;

    profiles.forEach(({ dna, weight }) => {
      const complexity = (dna.tone.cerebral + dna.narrative.nonLinear) / 2;
      totalComplexity += complexity * weight;
      totalWeight += weight;
    });

    return totalComplexity / totalWeight;
  }

  /**
   * Template-based interest cluster detection
   */
  private detectInterestClustersTemplate(
    watchlistItems: any[],
    dnaMap: Map<number, ContentDNA>
  ): UserTasteProfile['interestClusters'] {
    const clusterTemplates = [
      { name: 'Mind-Bending Sci-Fi', keyThemes: ['technology', 'identity'], keyTone: ['cerebral', 'tense'] },
      { name: 'Emotional Family Drama', keyThemes: ['familyDynamics', 'loss'], keyTone: ['emotional'] },
      { name: 'Dark Crime Thrillers', keyThemes: ['justice', 'betrayal'], keyTone: ['dark', 'tense'] },
      { name: 'Epic Adventure', keyThemes: ['survival', 'goodVsEvil'], keyTone: ['escapist'] },
      { name: 'Thoughtful Character Studies', keyThemes: ['identity', 'redemption'], keyTone: ['cerebral', 'emotional'] },
      { name: 'Action Spectacles', keyThemes: ['power', 'survival'], keyTone: ['escapist'] },
      { name: 'Quirky Comedies', keyThemes: ['friendship', 'identity'], keyTone: ['humorous'] },
      { name: 'Animated Masterpieces', keyThemes: ['comingOfAge', 'friendship'], keyTone: ['emotional', 'escapist'] },
    ];

    const userClusters: UserTasteProfile['interestClusters'] = [];

    for (const template of clusterTemplates) {
      const matchingItems: number[] = [];
      let totalScore = 0;

      for (const item of watchlistItems) {
        const dna = dnaMap.get(item.tmdb_id);
        if (!dna) continue;

        // Check if this content matches the cluster template
        const themeScore = template.keyThemes.reduce((sum, theme) => {
          return sum + (dna.themes[theme as keyof ContentDNA['themes']] || 0);
        }, 0) / template.keyThemes.length;

        const toneScore = template.keyTone.reduce((sum, tone) => {
          return sum + (dna.tone[tone as keyof ContentDNA['tone']] || 0);
        }, 0) / template.keyTone.length;

        const matchScore = (themeScore + toneScore) / 2;

        if (matchScore > 0.3) {
          matchingItems.push(item.tmdb_id);
          totalScore += matchScore;
        }
      }

      if (matchingItems.length >= 3) {
        userClusters.push({
          name: template.name,
          seedContent: matchingItems.slice(0, 10),
          strength: totalScore / matchingItems.length,
        });
      }
    }

    return userClusters.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  /**
   * Enhanced taste signature with specific labels
   */
  private computeTasteSignatureEnhanced(
    profiles: Array<{ dna: ContentDNA; weight: number }>,
    watchlistItems: any[],
    dnaMap: Map<number, ContentDNA>
  ): string {
    const tone = this.aggregateToneWeighted(profiles);
    const themes = this.aggregateThemesWeighted(profiles);
    const clusters = this.detectInterestClustersTemplate(watchlistItems, dnaMap);

    const parts: string[] = [];

    // Dominant tone with specific labels
    const toneEntries = Object.entries(tone).sort((a, b) => b[1] - a[1]);
    if (toneEntries[0][1] > 0.4) {
      const toneLabels: Record<string, string> = {
        dark: 'Dark',
        humorous: 'Comedy',
        tense: 'Thriller',
        emotional: 'Emotional',
        cerebral: 'Thoughtful',
        escapist: 'Adventure',
      };
      parts.push(toneLabels[toneEntries[0][0]] || toneEntries[0][0]);
    }

    // Dominant theme with specific labels
    const themeEntries = Object.entries(themes).sort((a, b) => b[1] - a[1]);
    if (themeEntries[0][1] > 0.3) {
      const themeLabels: Record<string, string> = {
        technology: 'Sci-Fi',
        familyDynamics: 'Family',
        justice: 'Crime',
        survival: 'Survival',
        love: 'Romance',
        identity: 'Character Study',
        goodVsEvil: 'Hero Stories',
        power: 'Power Dynamics',
      };
      const label = themeLabels[themeEntries[0][0]];
      if (label) parts.push(label);
    }

    // Top cluster
    if (clusters.length > 0) {
      parts.push(`${clusters[0].name} Fan`);
    }

    return parts.filter(Boolean).join(' • ') || 'Eclectic Viewer';
  }

  /**
   * Enhanced discovery opportunities with genre adjacency
   */
  private findDiscoveryOpportunitiesEnhanced(
    watchlistItems: any[],
    profiles: Array<{ dna: ContentDNA; weight: number }>
  ): string[] {
    const opportunities: string[] = [];
    const tone = this.aggregateToneWeighted(profiles);
    const themes = this.aggregateThemesWeighted(profiles);

    // Find unexplored tone + theme combinations
    const lowTones = Object.entries(tone)
      .filter(([_, score]) => score < 0.2)
      .map(([name]) => name);

    if (lowTones.includes('humorous') && tone.dark > 0.5) {
      opportunities.push('Dark Comedies - blend your love of dark content with humor');
    }

    if (lowTones.includes('cerebral') && tone.escapist > 0.5) {
      opportunities.push('Thought-provoking Sci-Fi - add intellectual depth to your escapist favorites');
    }

    if (lowTones.includes('emotional') && tone.tense > 0.6) {
      opportunities.push('Emotional Thrillers - combine tension with heartfelt storytelling');
    }

    // Find unexplored themes
    const lowThemes = Object.entries(themes)
      .filter(([_, score]) => score < 0.2)
      .map(([name]) => name);

    if (lowThemes.includes('comingOfAge')) {
      opportunities.push('Coming-of-age stories - unexplored territory for you');
    }

    if (lowThemes.includes('nature')) {
      opportunities.push('Nature documentaries and environmental stories');
    }

    if (lowThemes.includes('technology') && themes.power > 0.4) {
      opportunities.push('Tech-driven narratives - explore power dynamics through technology');
    }

    // Era-based opportunities
    const eras = profiles.map(({ dna }) => dna.production.era);
    if (!eras.includes('classic')) {
      opportunities.push('Classic cinema from the Golden Age');
    }

    return [...new Set(opportunities)].slice(0, 5);
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
