# LLM Recommendations Service

## Overview

The LLM Recommendations Service provides deeply personalized, AI-powered movie and TV show recommendations using Claude's advanced language model. Unlike traditional algorithmic recommendations, this service provides human-like reasoning and explanations for why specific content matches a user's taste profile.

## Architecture

### Security-First Design

All LLM API calls are routed through a **Supabase Edge Function** to protect API keys and control costs:

```
Client App → Supabase Edge Function → Claude API → TMDb Validation → Cache → Response
```

**Benefits:**
- 🔒 API keys never exposed to client-side code
- 💰 Centralized cost control via rate limiting
- ⚡ 24-hour response caching for instant results
- ✅ Automatic TMDb validation of all recommendations

## Rate Limiting

To control costs, the service implements strict rate limiting:

- **5 LLM calls per user per day**
- Automatically enforced by the Edge Function
- Exceeded calls return a 429 error with helpful message
- 24-hour rolling window resets automatically

### Checking Rate Limits

```typescript
import { llmRecommendationService } from '@/services/llmRecommendations';

// Check remaining calls
const { remaining, limit, resetAt } = await llmRecommendationService.getRemainingCalls();
console.log(`${remaining}/${limit} calls remaining`);
console.log(`Resets at: ${resetAt}`);

// Check if calls are available
const available = await llmRecommendationService.hasAvailableCalls();
if (!available) {
  console.log('Rate limit exceeded. Try again tomorrow.');
}
```

## Caching

All responses are cached for 24 hours:

- Cache key: `user_id + query_hash`
- Cached responses return instantly (no API call)
- Response includes `cached: true` flag
- Cache stored in `llm_recommendations_cache` table

## Usage Examples

### 1. Personalized Recommendations

Get recommendations based on a natural language query:

```typescript
import { llmRecommendationService } from '@/services/llmRecommendations';
import { recommendationOrchestrator } from '@/services/recommendationOrchestrator';

// Get user's taste profile
const profile = await recommendationOrchestrator.getUserProfile(userId);

// Get personalized recommendations
const response = await llmRecommendationService.getPersonalizedRecommendations(
  "I want something mind-bending with great cinematography",
  profile
);

console.log(response.explanation); // LLM's reasoning
console.log(response.cached); // true if from cache

response.recommendations.forEach(rec => {
  console.log(`${rec.title} (${rec.mediaType})`);
  console.log(`Reason: ${rec.reason}`);
  console.log(`TMDb ID: ${rec.tmdbId}`);
});
```

### 2. Mood-Based Recommendations

Get recommendations based on the user's current mood:

```typescript
const response = await llmRecommendationService.getMoodBasedRecommendations(
  "cozy and uplifting",
  profile
);

// Returns recommendations that match the specified mood
```

### 3. "More Like This" Recommendations

Get recommendations similar to a specific title:

```typescript
const response = await llmRecommendationService.getMoreLikeThis(
  "Inception",
  profile
);

// Returns titles similar to "Inception" based on user's taste
```

### 4. Weekly Newsletter

Generate a diverse weekly newsletter of recommendations:

```typescript
const response = await llmRecommendationService.getWeeklyNewsletter(profile);

// Returns curated mix of new releases, hidden gems, and classics
```

## Response Format

```typescript
interface LLMRecommendationResponse {
  recommendations: Array<{
    tmdbId: number;      // TMDb content ID (validated)
    title: string;       // Content title
    reason: string;      // Why this matches user's taste
    mediaType: 'movie' | 'tv';
  }>;
  explanation: string;   // Overall recommendation strategy
  cached: boolean;       // Whether response came from cache
}
```

## Setup & Deployment

### 1. Deploy Edge Function

```bash
# Navigate to Supabase project
cd supabase

# Deploy the Edge Function
supabase functions deploy llm-recommendations
```

### 2. Set Environment Variables

In your Supabase dashboard, add the following secrets:

```bash
# Anthropic API key (get from https://console.anthropic.com/)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# TMDb API key (for validating recommendations)
supabase secrets set TMDB_API_KEY=your-tmdb-key
```

### 3. Database Setup

The Edge Function requires the `llm_recommendations_cache` table (created in migration):

```sql
CREATE TABLE llm_recommendations_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for fast lookups
  CONSTRAINT unique_user_query UNIQUE (user_id, query_hash)
);

CREATE INDEX idx_llm_cache_user_created
  ON llm_recommendations_cache(user_id, created_at DESC);
```

## Error Handling

The service gracefully handles errors:

```typescript
try {
  const response = await llmRecommendationService.getPersonalizedRecommendations(
    query,
    profile
  );

  if (response.recommendations.length === 0) {
    console.log('No recommendations generated');
  }
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    // Show user-friendly rate limit message
    const { resetAt } = await llmRecommendationService.getRemainingCalls();
    console.log(`Try again after ${resetAt}`);
  } else {
    console.error('Failed to get recommendations:', error);
  }
}
```

## Cost Optimization

The service is designed to minimize API costs:

1. **Rate Limiting**: Max 5 calls per user per day
2. **Caching**: 24-hour cache prevents redundant API calls
3. **Model Selection**: Uses Claude Haiku (fast and cost-effective)
4. **Token Limits**: Max 1024 tokens per response
5. **TMDb Validation**: Ensures all recommendations are real content

### Estimated Costs

With Claude Haiku pricing:
- Input: $0.25 per million tokens
- Output: $1.25 per million tokens

Average cost per request: ~$0.002 - $0.005

With 1000 active users × 5 calls/day:
- **Daily cost**: $10 - $25
- **Monthly cost**: $300 - $750

Cache hit rate of 30% reduces costs by ~30%.

## Best Practices

### 1. Check Rate Limits Before Calling

```typescript
const canCall = await llmRecommendationService.hasAvailableCalls();

if (!canCall) {
  showRateLimitMessage();
  return;
}

const response = await llmRecommendationService.getPersonalizedRecommendations(query, profile);
```

### 2. Show Cache Status to Users

```typescript
if (response.cached) {
  showMessage("Loaded from your previous recommendations");
} else {
  const { remaining } = await llmRecommendationService.getRemainingCalls();
  showMessage(`${remaining} AI recommendations remaining today`);
}
```

### 3. Use Specific Queries

Better:
```typescript
"I want dark psychological thrillers with unreliable narrators"
```

Worse:
```typescript
"recommend me something good"
```

### 4. Include Taste Profile

Always pass the user's taste profile for personalized results:

```typescript
const profile = await recommendationOrchestrator.getUserProfile(userId);
const response = await llmRecommendationService.getPersonalizedRecommendations(
  query,
  profile  // ← Include this!
);
```

## Monitoring

Track LLM usage in your Supabase dashboard:

```sql
-- Total calls today
SELECT COUNT(*)
FROM llm_recommendations_cache
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Cache hit rate (approximate)
SELECT
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_cached_queries
FROM llm_recommendations_cache
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Top queries
SELECT
  query_text,
  COUNT(*) as frequency
FROM llm_recommendations_cache
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY query_text
ORDER BY frequency DESC
LIMIT 10;
```

## Future Enhancements

Potential improvements:

1. **Tiered Rate Limits**: Premium users get more calls
2. **Streaming Responses**: Real-time token streaming for better UX
3. **Conversation Memory**: Follow-up queries with context
4. **Multi-Modal Input**: Include images (e.g., movie posters)
5. **Scheduled Newsletters**: Automatic weekly recommendations
6. **A/B Testing**: Compare LLM vs algorithmic recommendations

## Troubleshooting

### "User not authenticated" error

Ensure the user has a valid Supabase session:

```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Redirect to login
}
```

### "Edge Function timeout" error

The Edge Function has a 30-second timeout. If Claude API is slow:
- Check your Anthropic API status
- Consider reducing `max_tokens` in Edge Function
- Verify network connectivity

### Empty recommendations

If `recommendations` array is empty:
- Check Claude API response in Edge Function logs
- Verify TMDb validation isn't filtering all results
- Ensure query is clear and specific

### Cache not working

If responses aren't cached:
- Check `llm_recommendations_cache` table exists
- Verify user has permission to insert
- Look for duplicate constraint violations

## Related Documentation

- [Recommendation Orchestrator](./recommendation-orchestrator.md)
- [Content DNA](./content-dna.md)
- [Taste Profile](./taste-profile.md)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Claude API Documentation](https://docs.anthropic.com/)
