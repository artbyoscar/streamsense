# StreamSense Recommendation System
## Complete 4-Layer Architecture

This document provides a comprehensive overview of the StreamSense recommendation system, which combines algorithmic precision with AI reasoning to deliver Netflix-quality personalized recommendations.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│             Layer 5: Interest Graph & Connections           │
│           (Graph-based discovery & explanations)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Layer 4: LLM Reasoning                   │
│         (Claude-powered deep personalization)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Layer 3: Multi-Lane Engine                     │
│         (Netflix-style recommendation rows)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│          Layer 2: User Taste Profile Building               │
│      (Weighted aggregation & pattern detection)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           Layer 1: Content DNA Extraction                   │
│        (Deep content attribute analysis)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Content DNA Extraction

**File:** [`src/services/contentDNA.ts`](src/services/contentDNA.ts)

### Purpose
Extract deep content attributes beyond basic genres using TMDb metadata.

### DNA Dimensions
- **Tone** (6 attributes): dark, humorous, tense, emotional, cerebral, escapist
- **Themes** (16 attributes): redemption, revenge, family dynamics, coming of age, good vs evil, survival, identity, power, love, loss, technology, nature, isolation, friendship, betrayal, justice
- **Pacing** (5 attributes): slow, medium, fast, episodic, serialized
- **Aesthetic** (6 attributes): visually stunning, gritty, stylized, animated, practical effects, CGI-heavy
- **Narrative** (6 attributes): non-linear, multi-perspective, unreliable narrator, twist ending, open-ended, closed ending
- **Talent**: directors, lead actors, writers, composers
- **Production**: era, budget tier, origin country
- **Content**: violence level, sexual content, language

### Key Methods
- `computeDNA(tmdbId, mediaType)` - Extract complete DNA profile for a title
- `computeSimilarity(dna1, dna2)` - Calculate cosine similarity between two DNA profiles

---

## Layer 2: User Taste Profile Building

**File:** [`src/services/contentDNA.ts`](src/services/contentDNA.ts) (lines 472-1420)

### Purpose
Build comprehensive user taste profiles with weighted aggregation and sophisticated pattern detection.

### Weighted Aggregation
Items are weighted by:
- **Rating**: 5-star = 1.67×, 3-star = 1.0×, 1-star = 0.33×
- **Recency**: Last 30 days = 1.5×, Last 90 days = 1.2×
- **Completion**: Watched = 1.3×, Watching = 1.1×

### Interest Cluster Detection
Uses template-based clustering to identify patterns:
- Mind-Bending Sci-Fi
- Emotional Family Drama
- Dark Crime Thrillers
- Epic Adventure
- Thoughtful Character Studies
- Action Spectacles
- Quirky Comedies
- Animated Masterpieces

Requires 3+ matching items per cluster, returns top 5 strongest clusters.

### Taste Signature
Generates readable labels like: "Dark • Crime • Dark Crime Thrillers Fan"

### Discovery Opportunities
Identifies unexplored tone + theme combinations for expansion.

### Key Methods
- `buildUserTasteProfile(userId)` - Build complete taste profile
- `calculateItemWeight(item)` - Calculate weighted importance
- `aggregateToneWeighted(profiles)` - Weighted tone aggregation
- `detectInterestClustersTemplate(items, dnaMap)` - Pattern detection

---

## Layer 3: Multi-Lane Recommendation Engine

**File:** [`src/services/recommendationLanes.ts`](src/services/recommendationLanes.ts)

### Purpose
Generate Netflix-style multi-row recommendations with different strategies per lane.

### 12 Lane Strategies

| Lane | Priority | Strategy | Description |
|------|----------|----------|-------------|
| Continue Watching | 100 | `continue_watching` | Resume interrupted viewing |
| Because You Watched | 90 | `because_you_watched` | DNA-based similarity matching |
| AI-Curated For You | 88 | `llm_powered` | Claude-powered deep personalization |
| Interest Clusters | 85-80 | `more_like_cluster` | Based on detected patterns |
| Favorite Director | 75 | `talent_spotlight` | Works by favorite talent |
| Theme Deep Dive | 70 | `theme_deep_dive` | Explore dominant themes |
| Hidden Gems | 65 | `hidden_gems` | High rating, low popularity |
| Trending For You | 60 | `trending_for_you` | Popular content filtered to taste |
| Exploration | 55 | `exploration` | Intentional variety in unexplored genres |
| Classic Essentials | 50 | `classic_essentials` | Acclaimed classics not yet watched |
| New Releases | 45 | `new_releases` | Recent content matching taste |
| Adjacent Interest | 40 | `adjacent_interest` | Bridge to new genres |

### Profile Matching Algorithm
Combines multiple DNA dimensions with weighted importance:
- Tone match: 30%
- Theme match: 35%
- Pacing match: 15%
- Talent bonus: 20%

Uses cosine similarity for vector comparisons.

### Key Methods
- `generateLanes(userId, context)` - Generate all recommendation lanes
- `findSimilarByDNA(seedContent, profile, limit)` - DNA-based similarity search
- `computeProfileMatch(dna, profile)` - Multi-dimensional matching
- `vectorSimilarity(v1, v2)` - Cosine similarity calculation

---

## Layer 4: LLM-Powered Personalization

**File:** [`src/services/llmRecommendations.ts`](src/services/llmRecommendations.ts)

### Purpose
Use Claude AI to provide deeply personalized, reasoning-based recommendations that go beyond algorithmic matching.

### What Makes LLM Recommendations Different
1. **Thematic Reasoning**: Makes deep connections between content themes and user interests
2. **Tonal Understanding**: Understands subtle tonal similarities algorithms might miss
3. **Talent Connections**: Identifies director/actor patterns in sophisticated ways
4. **Stretch Recommendations**: Intelligently suggests content to expand taste while respecting preferences
5. **Conversational Explanations**: Provides human-like reasoning for WHY each recommendation fits

### Recommendation Strategy
- 8 core recommendations - perfect matches for established taste
- 2 "stretch" recommendations - titles that could expand horizons
- Focus on hidden gems and overlooked titles
- Deep thematic and tonal connections
- Director/talent appreciation

### Key Features
- **Mood-based recommendations** - Considers current emotional state
- **Confidence scoring** - Each recommendation has 0-1 confidence score
- **Detailed reasoning** - Explains specific profile connections
- **TMDb validation** - Verifies all recommendations exist in TMDb

### Configuration
Requires Anthropic API key (set via `configureLLMService(apiKey)` or `ANTHROPIC_API_KEY` env var).

The LLM lane is **optional** - if API key is not configured, the system gracefully skips it and uses the 11 algorithmic lanes.

### Key Methods
- `getPersonalizedRecommendations(request)` - Main LLM recommendation endpoint
- `getMoodBasedRecommendations(userId, profile, mood)` - Mood-specific recommendations
- `getNextWatch(userId, profile, recentWatched)` - Single "perfect next watch"
- `buildPrompt(request)` - Construct Claude prompt from taste profile

---

## Integration Flow

```
User Opens App
     ↓
1. Build Taste Profile (Layer 2)
   - Fetch watchlist items
   - Compute DNA for each (Layer 1)
   - Apply weighted aggregation
   - Detect interest clusters
     ↓
2. Generate Recommendation Lanes (Layer 3)
   - Continue Watching
   - Because You Watched (DNA similarity)
   - AI-Curated (Layer 4) ← Optional LLM enhancement
   - Interest Clusters
   - Director Spotlight
   - Theme Deep Dive
   - Hidden Gems
   - Trending For You
   - Exploration
   - Classic Essentials
   - New Releases
   - Adjacent Interest
     ↓
3. Display in UI
   - Netflix-style horizontal scrolling rows
   - Each row shows lane title, subtitle, explanation
   - Cards show poster, title, rating, year
   - LLM recommendations include reasoning badges
```

---

## Performance Considerations

### Caching Strategy
- **Content DNA**: Cached per content item (localStorage)
- **Taste Profiles**: Built on-demand, cached for session
- **Recommendation Lanes**: Generated fresh on page load
- **LLM Recommendations**: No caching (always fresh reasoning)

### API Usage
- **TMDb API**: ~50-100 requests per recommendation generation
- **Anthropic API**: 1 request per LLM lane (only if API key configured)
  - Cost: ~$0.001 per request (Claude Haiku)
  - Response time: 2-5 seconds

### Optimization Tips
1. Build taste profile once per session
2. Cache DNA computations aggressively
3. Use LLM lane selectively (e.g., only on home screen)
4. Consider lazy-loading non-priority lanes
5. Batch TMDb requests where possible

---

## Usage Examples

### Basic Lane Generation
```typescript
import { recommendationLanesService } from '@/services/recommendationLanes';

const lanes = await recommendationLanesService.generateLanes(userId);

// Display lanes in UI
lanes.forEach(lane => {
  console.log(`${lane.title} (${lane.items.length} items)`);
  console.log(`  Strategy: ${lane.strategy}`);
  console.log(`  Explanation: ${lane.explanation}`);
});
```

### With Viewing Context
```typescript
const lanes = await recommendationLanesService.generateLanes(userId, {
  timeOfDay: 'evening',
  dayOfWeek: 'weekend',
  mood: 'relaxed',
});
```

### LLM-Only Recommendations
```typescript
import { llmRecommendationService, configureLLMService } from '@/services/llmRecommendations';
import { contentDNAService } from '@/services/contentDNA';

// Configure API key
configureLLMService('your-api-key');

// Build taste profile
const profile = await contentDNAService.buildUserTasteProfile(userId);

// Get LLM recommendations
const response = await llmRecommendationService.getPersonalizedRecommendations({
  userId,
  tasteProfile: profile,
  recentWatched: [],
  limit: 10,
});

response.recommendations.forEach(rec => {
  console.log(`${rec.title} (${rec.vote_average}/10)`);
  console.log(`  Reasoning: ${rec.llmReasoning}`);
  console.log(`  Confidence: ${rec.llmConfidence}`);
  console.log(`  Stretch: ${rec.isStretch}`);
});
```

### Mood-Based Recommendations
```typescript
const response = await llmRecommendationService.getMoodBasedRecommendations(
  userId,
  profile,
  'Feeling introspective, want something thought-provoking but not too heavy',
  10
);
```

---

## Layer 5: Interest Graph & Connections

**File:** [`src/services/interestGraph.ts`](src/services/interestGraph.ts)

### Purpose
Map how user interests connect to enable powerful discovery through graph-based analysis.

### Graph Structure

**Nodes (Interest Types):**
- Genres (e.g., "Sci-Fi", "Thriller")
- Themes (e.g., "technology", "betrayal")
- Tones (e.g., "dark", "cerebral")
- Directors (e.g., "Christopher Nolan")
- Actors (e.g., "Ryan Gosling")
- Keywords (from TMDb)
- Franchises (e.g., "Marvel Cinematic Universe")

Each node has:
- `userStrength`: 0-1 score for how much user likes this interest
- `count`: Number of times it appears in watched content

**Edges (Connections):**
- `often_together`: Interests that frequently co-occur
- `thematic_link`: Known thematic relationships
- `talent_connection`: Director/actor relationships
- `same_director`: Content from same director
- `franchise`: Part of same franchise

Each edge has:
- `weight`: Connection strength (0-1)
- `coOccurrenceCount`: How many times interests appeared together

### Key Capabilities

#### 1. Bridge Content Discovery
Finds content that connects two different interests:
```typescript
const bridges = await interestGraphService.findBridgeContent(
  'genre_878',    // Sci-Fi
  'theme_identity' // Identity themes
);
// Returns: Mind-bending sci-fi that explores identity
```

#### 2. Interest Suggestions
Suggests new interests based on graph connections:
```typescript
const suggestions = interestGraphService.suggestNewInterests([
  'genre_53',  // Thriller
  'tone_dark'  // Dark tone
]);
// Returns: "Crime" (connected to both Thriller and Dark)
```

#### 3. Recommendation Explanations
Generates human-readable explanations:
```typescript
const explanation = interestGraphService.explainConnection(
  content,
  userProfile,
  contentDNA
);
// Returns: "From Denis Villeneuve, a director you love • Strong technology themes you appreciate • Thought-provoking tone you prefer"
```

#### 4. Graph Visualization
Export graph data for visualization:
```typescript
const graph = interestGraphService.exportGraph();
// Returns: { nodes: [...], edges: [...] }
// Can be used with D3.js, vis.js, etc.
```

### Pre-Defined Relationships

The service includes 30+ known thematic relationships:

**Genre Bridges:**
- Sci-Fi ↔ Fantasy (0.7)
- Action ↔ Thriller (0.8)
- Drama ↔ Romance (0.6)
- Crime ↔ Thriller (0.9)
- Horror ↔ Thriller (0.8)

**Theme Bridges:**
- Technology ↔ Identity (0.7)
- Power ↔ Betrayal (0.8)
- Family Dynamics ↔ Coming of Age (0.7)
- Survival ↔ Isolation (0.8)
- Love ↔ Loss (0.7)

**Tone ↔ Theme Bridges:**
- Cerebral ↔ Identity (0.6)
- Dark ↔ Betrayal (0.7)
- Emotional ↔ Loss (0.7)
- Tense ↔ Survival (0.8)

### Use Cases

**1. "Bridge Builder" Lane**
Create a recommendation lane that bridges user's diverse interests:
```typescript
const userInterests = ['genre_878', 'tone_emotional'];
const bridges = await interestGraphService.findBridgeContent(
  userInterests[0],
  userInterests[1],
  15
);
```

**2. Discovery Suggestions**
Help users expand their taste:
```typescript
const currentInterests = profile.interestClusters.map(c => c.name);
const newInterests = interestGraphService.suggestNewInterests(
  currentInterests,
  10
);
// Show as "You might also like: Crime thrillers (based on your love of Dark content and Suspenseful tone)"
```

**3. Enhanced Explanations**
Make recommendations more transparent:
```typescript
for (const rec of recommendations) {
  const dna = await contentDNAService.computeDNA(rec.id, rec.media_type);
  const explanation = interestGraphService.explainConnection(
    rec,
    userProfile,
    dna
  );
  rec.explanation = explanation;
}
```

**4. Visual Interest Map**
Show users their taste graph:
```typescript
await interestGraphService.buildUserGraph(userId);
const summary = interestGraphService.getGraphSummary();

console.log(`Your interests: ${summary.nodeCount} nodes, ${summary.edgeCount} connections`);
console.log('Top interests:', summary.topInterests.map(n => n.name).join(', '));
```

### Integration with Other Layers

Layer 5 enhances other layers:

- **Layer 3 (Multi-Lane)**: Add bridge lanes and explanation text
- **Layer 4 (LLM)**: Provide graph context to improve LLM reasoning
- **Layer 2 (Taste Profile)**: Use graph to identify hidden pattern connections

### Key Methods

- `buildUserGraph(userId)` - Build interest graph from watched content
- `findBridgeContent(fromInterest, toInterest, limit)` - Find connecting content
- `suggestNewInterests(currentInterests, limit)` - Suggest expansion opportunities
- `explainConnection(content, profile, dna)` - Generate recommendation explanation
- `getGraphSummary()` - Get graph statistics
- `exportGraph()` - Export for visualization

---

## Future Enhancements

### Potential Layer 5: Reinforcement Learning
- Track user engagement with recommendations
- Learn from implicit feedback (clicks, watch time, completions)
- Adjust lane priorities dynamically
- Personalize lane strategies per user

### Enhanced LLM Integration
- Real-time conversational recommendations
- "Explain this recommendation" feature
- Follow-up questions ("Show me more like this but funnier")
- Temporal awareness (time of day, day of week, season)

### Social Features
- "Because your friend watched" lane
- Group recommendation consensus
- Shared watchlist recommendations

### Content Understanding
- Subtitle/dialogue analysis for deeper theme extraction
- Visual scene analysis for aesthetic profiling
- Music/soundtrack analysis for mood detection

---

## Technical Stack

- **TypeScript** - Type-safe implementation
- **TMDb API** - Content metadata source
- **Supabase** - User watchlist data
- **Anthropic Claude** - LLM reasoning (Layer 4)
- **React Native** - Mobile UI (future integration)

---

## File Structure

```
src/services/
├── contentDNA.ts              # Layer 1 & 2: DNA extraction + Taste profiles
├── recommendationLanes.ts     # Layer 3: Multi-lane engine
├── llmRecommendations.ts      # Layer 4: LLM-powered recommendations
├── interestGraph.ts           # Layer 5: Interest graph & connections
├── tmdb.ts                    # TMDb API client
├── supabase.ts                # Supabase client
└── genreAffinity.ts           # Legacy genre-based system
```

---

## Summary

StreamSense implements a sophisticated 5-layer recommendation system that rivals Netflix in complexity and personalization:

1. **Layer 1 (DNA Extraction)** - Deep content understanding beyond genres
2. **Layer 2 (Taste Profiles)** - Weighted user preference modeling
3. **Layer 3 (Multi-Lane Engine)** - 12 different recommendation strategies
4. **Layer 4 (LLM Reasoning)** - AI-powered deep personalization
5. **Layer 5 (Interest Graph)** - Graph-based discovery and explanations

The system is production-ready, fully typed, and integrates seamlessly with the existing StreamSense architecture.
