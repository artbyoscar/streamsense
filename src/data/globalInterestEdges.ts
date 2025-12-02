/**
 * Global Interest Graph Edges
 * Pre-defined relationships between genres, themes, and tones
 * These form the foundation for personalized recommendations
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GlobalEdge {
  from: string;
  to: string;
  weight: number; // 0.0 to 1.0, how strong the connection is
  type: 'often_together' | 'thematic' | 'genre_theme' | 'tone_genre' | 'tone_theme';
  description?: string;
}

// ============================================================================
// GLOBAL EDGES
// ============================================================================

/**
 * Pre-defined edges that represent common patterns in content
 * These are domain knowledge encoded into the graph
 */
export const GLOBAL_EDGES: GlobalEdge[] = [
  // ========================================================================
  // GENRE ↔ GENRE RELATIONSHIPS (Often appear together)
  // ========================================================================
  {
    from: 'genre_878',
    to: 'genre_14',
    weight: 0.7,
    type: 'often_together',
    description: 'Sci-Fi and Fantasy often blend together',
  },
  {
    from: 'genre_28',
    to: 'genre_53',
    weight: 0.8,
    type: 'often_together',
    description: 'Action and Thriller go hand in hand',
  },
  {
    from: 'genre_18',
    to: 'genre_10749',
    weight: 0.6,
    type: 'often_together',
    description: 'Drama often includes Romance',
  },
  {
    from: 'genre_80',
    to: 'genre_53',
    weight: 0.85,
    type: 'often_together',
    description: 'Crime and Thriller are closely related',
  },
  {
    from: 'genre_27',
    to: 'genre_53',
    weight: 0.75,
    type: 'often_together',
    description: 'Horror creates Thriller elements',
  },
  {
    from: 'genre_12',
    to: 'genre_14',
    weight: 0.7,
    type: 'often_together',
    description: 'Adventure and Fantasy complement each other',
  },
  {
    from: 'genre_16',
    to: 'genre_10751',
    weight: 0.6,
    type: 'often_together',
    description: 'Animation often targets Family audiences',
  },
  {
    from: 'genre_80',
    to: 'genre_18',
    weight: 0.65,
    type: 'often_together',
    description: 'Crime stories are often dramatic',
  },
  {
    from: 'genre_878',
    to: 'genre_28',
    weight: 0.6,
    type: 'often_together',
    description: 'Sci-Fi frequently includes Action',
  },
  {
    from: 'genre_14',
    to: 'genre_28',
    weight: 0.65,
    type: 'often_together',
    description: 'Fantasy adventures include Action',
  },
  {
    from: 'genre_27',
    to: 'genre_9648',
    weight: 0.7,
    type: 'often_together',
    description: 'Horror often has Mystery elements',
  },
  {
    from: 'genre_99',
    to: 'genre_36',
    weight: 0.5,
    type: 'often_together',
    description: 'Documentary can cover History',
  },

  // ========================================================================
  // THEME ↔ THEME RELATIONSHIPS (Thematic connections)
  // ========================================================================
  {
    from: 'theme_technology',
    to: 'theme_identity',
    weight: 0.7,
    type: 'thematic',
    description: 'Technology questions identity and humanity',
  },
  {
    from: 'theme_power',
    to: 'theme_betrayal',
    weight: 0.8,
    type: 'thematic',
    description: 'Power struggles involve betrayal',
  },
  {
    from: 'theme_family',
    to: 'theme_loyalty',
    weight: 0.75,
    type: 'thematic',
    description: 'Family bonds test loyalty',
  },
  {
    from: 'theme_survival',
    to: 'theme_sacrifice',
    weight: 0.8,
    type: 'thematic',
    description: 'Survival requires sacrifice',
  },
  {
    from: 'theme_justice',
    to: 'theme_redemption',
    weight: 0.7,
    type: 'thematic',
    description: 'Justice stories explore redemption',
  },
  {
    from: 'theme_love',
    to: 'theme_loss',
    weight: 0.7,
    type: 'thematic',
    description: 'Love stories often involve loss',
  },
  {
    from: 'theme_identity',
    to: 'theme_redemption',
    weight: 0.65,
    type: 'thematic',
    description: 'Finding identity leads to redemption',
  },
  {
    from: 'theme_freedom',
    to: 'theme_rebellion',
    weight: 0.85,
    type: 'thematic',
    description: 'Freedom requires rebellion',
  },
  {
    from: 'theme_tradition',
    to: 'theme_family',
    weight: 0.7,
    type: 'thematic',
    description: 'Tradition shapes family dynamics',
  },
  {
    from: 'theme_innovation',
    to: 'theme_technology',
    weight: 0.75,
    type: 'thematic',
    description: 'Innovation drives technological change',
  },
  {
    from: 'theme_nature',
    to: 'theme_survival',
    weight: 0.65,
    type: 'thematic',
    description: 'Nature tests survival',
  },
  {
    from: 'theme_power',
    to: 'theme_corruption',
    weight: 0.8,
    type: 'thematic',
    description: 'Power leads to corruption',
  },

  // ========================================================================
  // GENRE ↔ THEME BRIDGES (Genres that express themes)
  // ========================================================================
  {
    from: 'genre_878',
    to: 'theme_technology',
    weight: 0.8,
    type: 'genre_theme',
    description: 'Sci-Fi explores technology',
  },
  {
    from: 'genre_878',
    to: 'theme_identity',
    weight: 0.6,
    type: 'genre_theme',
    description: 'Sci-Fi questions identity',
  },
  {
    from: 'genre_80',
    to: 'theme_justice',
    weight: 0.75,
    type: 'genre_theme',
    description: 'Crime deals with justice',
  },
  {
    from: 'genre_80',
    to: 'theme_power',
    weight: 0.7,
    type: 'genre_theme',
    description: 'Crime explores power dynamics',
  },
  {
    from: 'genre_18',
    to: 'theme_family',
    weight: 0.65,
    type: 'genre_theme',
    description: 'Drama focuses on family',
  },
  {
    from: 'genre_18',
    to: 'theme_identity',
    weight: 0.6,
    type: 'genre_theme',
    description: 'Drama explores identity',
  },
  {
    from: 'genre_10752',
    to: 'theme_survival',
    weight: 0.8,
    type: 'genre_theme',
    description: 'War films emphasize survival',
  },
  {
    from: 'genre_10752',
    to: 'theme_sacrifice',
    weight: 0.75,
    type: 'genre_theme',
    description: 'War stories involve sacrifice',
  },
  {
    from: 'genre_12',
    to: 'theme_freedom',
    weight: 0.7,
    type: 'genre_theme',
    description: 'Adventure seeks freedom',
  },
  {
    from: 'genre_14',
    to: 'theme_good_vs_evil',
    weight: 0.75,
    type: 'genre_theme',
    description: 'Fantasy explores good vs evil',
  },
  {
    from: 'genre_27',
    to: 'theme_fear',
    weight: 0.85,
    type: 'genre_theme',
    description: 'Horror explores fear',
  },
  {
    from: 'genre_10749',
    to: 'theme_love',
    weight: 0.9,
    type: 'genre_theme',
    description: 'Romance is about love',
  },
  {
    from: 'genre_10749',
    to: 'theme_sacrifice',
    weight: 0.6,
    type: 'genre_theme',
    description: 'Romance involves sacrifice',
  },
  {
    from: 'genre_37',
    to: 'theme_justice',
    weight: 0.8,
    type: 'genre_theme',
    description: 'Westerns explore frontier justice',
  },

  // ========================================================================
  // TONE ↔ GENRE BRIDGES (Tones that match genres)
  // ========================================================================
  {
    from: 'tone_dark',
    to: 'genre_27',
    weight: 0.8,
    type: 'tone_genre',
    description: 'Dark tone suits Horror',
  },
  {
    from: 'tone_dark',
    to: 'genre_53',
    weight: 0.7,
    type: 'tone_genre',
    description: 'Dark tone enhances Thriller',
  },
  {
    from: 'tone_dark',
    to: 'genre_80',
    weight: 0.75,
    type: 'tone_genre',
    description: 'Dark tone fits Crime',
  },
  {
    from: 'tone_cerebral',
    to: 'genre_878',
    weight: 0.65,
    type: 'tone_genre',
    description: 'Cerebral tone matches Sci-Fi',
  },
  {
    from: 'tone_cerebral',
    to: 'genre_9648',
    weight: 0.7,
    type: 'tone_genre',
    description: 'Cerebral tone suits Mystery',
  },
  {
    from: 'tone_escapist',
    to: 'genre_12',
    weight: 0.75,
    type: 'tone_genre',
    description: 'Escapist tone drives Adventure',
  },
  {
    from: 'tone_escapist',
    to: 'genre_14',
    weight: 0.7,
    type: 'tone_genre',
    description: 'Escapist tone defines Fantasy',
  },
  {
    from: 'tone_emotional',
    to: 'genre_18',
    weight: 0.75,
    type: 'tone_genre',
    description: 'Emotional tone characterizes Drama',
  },
  {
    from: 'tone_emotional',
    to: 'genre_10749',
    weight: 0.7,
    type: 'tone_genre',
    description: 'Emotional tone defines Romance',
  },
  {
    from: 'tone_humorous',
    to: 'genre_35',
    weight: 0.85,
    type: 'tone_genre',
    description: 'Humorous tone is Comedy',
  },
  {
    from: 'tone_lighthearted',
    to: 'genre_10751',
    weight: 0.7,
    type: 'tone_genre',
    description: 'Lighthearted tone suits Family',
  },
  {
    from: 'tone_suspenseful',
    to: 'genre_53',
    weight: 0.85,
    type: 'tone_genre',
    description: 'Suspenseful tone is Thriller',
  },
  {
    from: 'tone_serious',
    to: 'genre_36',
    weight: 0.7,
    type: 'tone_genre',
    description: 'Serious tone fits History',
  },

  // ========================================================================
  // TONE ↔ THEME BRIDGES (Tones that express themes)
  // ========================================================================
  {
    from: 'tone_dark',
    to: 'theme_betrayal',
    weight: 0.7,
    type: 'tone_theme',
    description: 'Dark tone explores betrayal',
  },
  {
    from: 'tone_dark',
    to: 'theme_loss',
    weight: 0.65,
    type: 'tone_theme',
    description: 'Dark tone conveys loss',
  },
  {
    from: 'tone_emotional',
    to: 'theme_love',
    weight: 0.75,
    type: 'tone_theme',
    description: 'Emotional tone expresses love',
  },
  {
    from: 'tone_emotional',
    to: 'theme_sacrifice',
    weight: 0.7,
    type: 'tone_theme',
    description: 'Emotional tone highlights sacrifice',
  },
  {
    from: 'tone_cerebral',
    to: 'theme_identity',
    weight: 0.7,
    type: 'tone_theme',
    description: 'Cerebral tone questions identity',
  },
  {
    from: 'tone_escapist',
    to: 'theme_freedom',
    weight: 0.75,
    type: 'tone_theme',
    description: 'Escapist tone seeks freedom',
  },
  {
    from: 'tone_serious',
    to: 'theme_justice',
    weight: 0.7,
    type: 'tone_theme',
    description: 'Serious tone examines justice',
  },
];

/**
 * Get all edges involving a specific node
 */
export function getEdgesForNode(nodeId: string): GlobalEdge[] {
  return GLOBAL_EDGES.filter(edge => edge.from === nodeId || edge.to === nodeId);
}

/**
 * Get edge weight between two nodes (bidirectional)
 */
export function getEdgeWeight(node1: string, node2: string): number {
  const edge = GLOBAL_EDGES.find(
    e => (e.from === node1 && e.to === node2) || (e.from === node2 && e.to === node1)
  );
  return edge?.weight || 0;
}

/**
 * Find path between two nodes (for recommendation explanations)
 */
export function findPath(from: string, to: string, maxDepth = 3): string[] | null {
  const visited = new Set<string>();
  const queue: Array<{ node: string; path: string[] }> = [{ node: from, path: [from] }];

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;

    if (node === to) {
      return path;
    }

    if (path.length >= maxDepth) {
      continue;
    }

    if (visited.has(node)) {
      continue;
    }

    visited.add(node);

    // Find all connected nodes
    const edges = getEdgesForNode(node);
    for (const edge of edges) {
      const nextNode = edge.from === node ? edge.to : edge.from;
      if (!visited.has(nextNode)) {
        queue.push({ node: nextNode, path: [...path, nextNode] });
      }
    }
  }

  return null; // No path found
}
