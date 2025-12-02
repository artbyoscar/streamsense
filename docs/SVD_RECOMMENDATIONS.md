# Netflix-Style SVD Matrix Factorization Recommendations

This document explains the SVD (Singular Value Decomposition) collaborative filtering system implemented in StreamSense.

## Overview

The SVD recommendation engine uses matrix factorization to predict user ratings for content they haven't seen yet, similar to how Netflix builds personalized recommendations.

### How It Works

1. **Build User-Item Matrix**: Creates a matrix where rows are users, columns are content items, and values are ratings derived from watchlist status
2. **SVD Decomposition**: Decomposes the matrix into three matrices: `U × S × V^T`
   - `U`: User factors (latent preferences)
   - `S`: Singular values (importance weights)
   - `V`: Item factors (latent features)
3. **Predict Ratings**: Reconstructs ratings for unseen items using the factorized matrices
4. **Cache Results**: Stores top predictions in `svd_recommendations` table for fast lookups

### Rating Scale

Watchlist status is converted to ratings:
- `watched`: 5.0 (loved it, finished it)
- `watching`: 4.0 (currently enjoying)
- `want_to_watch`: 3.0 (interested)
- `hidden`: 1.0 (not interested)

## Architecture

### Files

```
src/services/matrixFactorization.ts        - Core SVD algorithm (client-side)
supabase/functions/compute-svd-recommendations/index.ts  - Edge Function for batch computation
supabase/migrations/20251202000000_create_svd_recommendations.sql  - Database schema
```

### Database Schema

```sql
CREATE TABLE svd_recommendations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tmdb_id INTEGER NOT NULL,
  predicted_rating DECIMAL(3, 2),  -- 1.0 to 5.0
  confidence DECIMAL(3, 2),         -- 0.0 to 1.0
  rank INTEGER,                     -- 1 = best recommendation
  computed_at TIMESTAMP,
  UNIQUE(user_id, tmdb_id)
);
```

## Usage

### 1. Automatic Integration

SVD recommendations are automatically blended into the main recommendation flow:

```typescript
import { getSmartRecommendations } from '@/services/smartRecommendations';

const recommendations = await getSmartRecommendations({
  userId: user.id,
  limit: 20,
  mediaType: 'mixed',
});
// Returns 70% genre-based + 30% SVD recommendations
```

### 2. Direct SVD Recommendations

Get pure SVD recommendations:

```typescript
import { getSVDRecommendations } from '@/services/matrixFactorization';

const predictions = await getSVDRecommendations(userId, 20);
// Returns: [{ tmdbId, predictedRating, confidence }, ...]
```

### 3. Batch Computation (Nightly)

Compute recommendations for all users:

```typescript
import { computeAllRecommendations } from '@/services/matrixFactorization';

// Run this nightly via cron job or manual trigger
await computeAllRecommendations();
```

### 4. Edge Function Trigger

Call the Supabase Edge Function to compute recommendations:

```bash
curl -X POST https://[your-project].supabase.co/functions/v1/compute-svd-recommendations \
  -H "Authorization: Bearer [service_role_key]" \
  -H "Content-Type: application/json" \
  -d '{"userId": "optional-user-id", "force": true}'
```

## Performance

### Caching Strategy

- **Cache Duration**: 24 hours
- **Cache Invalidation**: Automatic on stale data or force refresh
- **Fallback**: Uses genre-based recommendations if SVD unavailable

### Computation Time

- **Matrix Size**: N users × M items (sparse matrix ~99% empty)
- **SVD Factors**: 50 latent factors (configurable)
- **Computation**: O(N × M × k) where k = number of factors
- **Typical Time**: 2-5 seconds for 1000 users × 10,000 items

### Scalability

- **Client-Side**: Good for <1000 users, <10,000 items
- **Edge Function**: Good for <10,000 users (simplified algorithm)
- **Future**: Move to dedicated Python service for >10,000 users

## Algorithm Details

### Matrix Factorization

Given a user-item interaction matrix `R` (N×M):

```
R ≈ U × S × V^T
```

Where:
- `U` (N×k): User latent factors
- `S` (k): Singular values
- `V` (M×k): Item latent factors
- `k`: Number of latent factors (50 default)

### Prediction Formula

For user `u` and item `i`:

```
rating(u, i) = Σ(k=1 to K) U[u,k] × S[k] × V[i,k]
```

### Confidence Calculation

```
confidence = Σ(|V[i,k]| × S[k]) / Σ(S[k])
```

Higher singular values contribute more → higher confidence

## Monitoring

### Console Logs

Watch for these logs to verify SVD is working:

```
[SVD] Fetching user interactions from database...
[SVD] Loaded 150 user interactions
[SVD] Matrix dimensions: 15 users × 120 items
[SVD] Matrix sparsity: 91.67% (150 filled cells)
[SVD] Performing SVD with 50 latent factors...
[SVD] SVD completed in 245ms
[SVD] Cached 20 recommendations for user abc-123
```

```
[SmartRecs] Found 20 SVD predictions
[SmartRecs] Blended with SVD: { svdItems: 6, total: 20 }
```

### Database Queries

Check cached recommendations:

```sql
-- See recommendations for a user
SELECT tmdb_id, predicted_rating, confidence, rank, computed_at
FROM svd_recommendations
WHERE user_id = '[user-id]'
ORDER BY rank
LIMIT 10;

-- Check freshness
SELECT user_id, COUNT(*) as rec_count, MAX(computed_at) as last_computed
FROM svd_recommendations
GROUP BY user_id;
```

## Maintenance

### When to Recompute

Trigger recomputation when:
1. **Scheduled**: Nightly at 3 AM (recommended)
2. **Manual**: User requests refresh
3. **Threshold**: User adds >10 items to watchlist
4. **Stale**: Cache >24 hours old

### Performance Tuning

Adjust latent factors in `matrixFactorization.ts`:

```typescript
const { U, S, V } = performSVD(matrix, 50); // <- Change this
```

- **Lower** (20-30): Faster, less accurate
- **Higher** (70-100): Slower, more accurate
- **Default** (50): Good balance

### Blend Ratio

Adjust SVD vs. genre-based ratio in `smartRecommendations.ts`:

```typescript
const svdCount = Math.ceil(limit * 0.3); // <- 30% SVD, 70% genre-based
```

## Troubleshooting

### No SVD Recommendations

**Cause**: Not enough interaction data

**Solution**:
- Need minimum 10 users with 5+ interactions each
- Fallback to genre-based recommendations automatically

### Stale Recommendations

**Cause**: Cache not refreshing

**Solution**:
```typescript
// Force refresh
await computeAllRecommendations();
```

### Slow Performance

**Cause**: Too many items in matrix

**Solution**:
- Reduce latent factors from 50 to 30
- Implement item popularity filtering (top 5000 items only)
- Move to server-side computation

## Future Enhancements

1. **Implicit Feedback**: Use view time, swipe direction as additional signals
2. **Temporal Dynamics**: Weight recent interactions more heavily
3. **Item Features**: Incorporate genre, rating, popularity into factorization
4. **Online Learning**: Update model incrementally instead of full recomputation
5. **Deep Learning**: Replace SVD with neural collaborative filtering

## References

- [Matrix Factorization Techniques](https://datajobs.com/data-science-repo/Recommender-Systems-[Netflix].pdf) - Original Netflix paper
- [Surprise Library](http://surpriselib.com/) - Python recommendation library
- [ml-matrix](https://github.com/mljs/matrix) - JavaScript SVD implementation
