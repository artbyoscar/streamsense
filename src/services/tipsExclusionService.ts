/**
 * Tips Exclusion Service
 *
 * Manages content exclusions across different sections of the Tips/Recommendations screen
 * to prevent duplicate content from appearing in multiple sections.
 */

class TipsExclusionService {
    private shownInWorthWatching: Set<number> = new Set();
    private shownInHiddenGems: Set<number> = new Set();
    private shownInRewatch: Set<number> = new Set();
    private watchlistIds: Set<number> = new Set();

    /**
     * Initialize with watchlist IDs to ensure they are always excluded from discovery
     */
    initialize(watchlistIds: number[]) {
        this.watchlistIds = new Set(watchlistIds);
        this.clear();
    }

    /**
     * Clear all session exclusions (except watchlist)
     */
    clear() {
        this.shownInWorthWatching.clear();
        this.shownInHiddenGems.clear();
        this.shownInRewatch.clear();
    }

    /**
     * Mark items as shown in a specific section
     */
    markShown(section: 'worthWatching' | 'hiddenGems' | 'rewatch', contentIds: number[]) {
        const targetSet = this.getSectionSet(section);
        contentIds.forEach(id => targetSet.add(id));
    }

    /**
     * Check if an item is shown anywhere or is in watchlist
     */
    isExcluded(contentId: number): boolean {
        return (
            this.watchlistIds.has(contentId) ||
            this.shownInWorthWatching.has(contentId) ||
            this.shownInHiddenGems.has(contentId) ||
            this.shownInRewatch.has(contentId)
        );
    }

    /**
     * Get all excluded IDs (watchlist + shown in any section)
     */
    getAllExcludedIds(): number[] {
        const allIds = new Set([
            ...this.watchlistIds,
            ...this.shownInWorthWatching,
            ...this.shownInHiddenGems,
            ...this.shownInRewatch
        ]);
        return Array.from(allIds);
    }

    private getSectionSet(section: 'worthWatching' | 'hiddenGems' | 'rewatch'): Set<number> {
        switch (section) {
            case 'worthWatching': return this.shownInWorthWatching;
            case 'hiddenGems': return this.shownInHiddenGems;
            case 'rewatch': return this.shownInRewatch;
        }
    }
}

export const tipsExclusionService = new TipsExclusionService();
