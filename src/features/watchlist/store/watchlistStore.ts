/**
 * Watchlist Store
 * Global state management for watchlist using Zustand
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  WatchlistItem,
  WatchlistItemInsert,
  WatchlistItemUpdate,
  WatchlistPriority,
} from '@/types';
import * as watchlistService from '../services/watchlistService';

// ============================================================================
// TYPES
// ============================================================================

export type SortOption = 'date' | 'priority' | 'title';
export type FilterOption = 'all' | 'movies' | 'tv';

interface WatchlistState {
  // State
  watchlist: WatchlistItem[];
  isLoading: boolean;
  error: string | null;
  sortBy: SortOption;
  filterBy: FilterOption;

  // Actions
  fetchWatchlist: () => Promise<void>;
  addToWatchlist: (item: WatchlistItemInsert) => Promise<WatchlistItem>;
  updateWatchlistItem: (id: string, updates: WatchlistItemUpdate) => Promise<WatchlistItem>;
  removeFromWatchlist: (id: string) => Promise<void>;
  markAsWatched: (id: string) => Promise<void>;
  setSortBy: (sortBy: SortOption) => void;
  setFilterBy: (filterBy: FilterOption) => void;
  reset: () => void;

  // Computed/Derived Values
  getFilteredAndSortedWatchlist: () => WatchlistItem[];
  getWatchlistCount: () => number;
  getUnwatchedCount: () => number;
  isInWatchlist: (contentId: string) => boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  watchlist: [],
  isLoading: false,
  error: null,
  sortBy: 'date' as SortOption,
  filterBy: 'all' as FilterOption,
};

// ============================================================================
// STORE
// ============================================================================

export const useWatchlistStore = create<WatchlistState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================================================
      // FETCH WATCHLIST
      // ========================================================================

      fetchWatchlist: async () => {
        set({ isLoading: true, error: null });
        try {
          const watchlist = await watchlistService.fetchWatchlist();
          set({ watchlist, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // ADD TO WATCHLIST
      // ========================================================================

      addToWatchlist: async (item: WatchlistItemInsert) => {
        set({ isLoading: true, error: null });
        try {
          const newItem = await watchlistService.addToWatchlist(item);
          set((state) => ({
            watchlist: [newItem, ...state.watchlist],
            isLoading: false,
          }));
          return newItem;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // UPDATE WATCHLIST ITEM
      // ========================================================================

      updateWatchlistItem: async (id: string, updates: WatchlistItemUpdate) => {
        set({ isLoading: true, error: null });
        try {
          const updatedItem = await watchlistService.updateWatchlistItem(id, updates);
          set((state) => ({
            watchlist: state.watchlist.map((item) =>
              item.id === id ? updatedItem : item
            ),
            isLoading: false,
          }));
          return updatedItem;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // REMOVE FROM WATCHLIST
      // ========================================================================

      removeFromWatchlist: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await watchlistService.removeFromWatchlist(id);
          set((state) => ({
            watchlist: state.watchlist.filter((item) => item.id !== id),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // MARK AS WATCHED
      // ========================================================================

      markAsWatched: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const updatedItem = await watchlistService.markAsWatched(id);
          set((state) => ({
            watchlist: state.watchlist.map((item) =>
              item.id === id ? updatedItem : item
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // ========================================================================
      // FILTERS AND SORTING
      // ========================================================================

      setSortBy: (sortBy: SortOption) => {
        set({ sortBy });
      },

      setFilterBy: (filterBy: FilterOption) => {
        set({ filterBy });
      },

      // ========================================================================
      // RESET
      // ========================================================================

      reset: () => {
        set(initialState);
      },

      // ========================================================================
      // COMPUTED/DERIVED VALUES
      // ========================================================================

      getFilteredAndSortedWatchlist: () => {
        const { watchlist, sortBy, filterBy } = get();

        // Filter by type
        let filtered = watchlist;
        if (filterBy === 'movies') {
          filtered = watchlist.filter((item) => item.content?.type === 'movie');
        } else if (filterBy === 'tv') {
          filtered = watchlist.filter((item) => item.content?.type === 'tv');
        }

        // Sort
        const sorted = [...filtered].sort((a, b) => {
          switch (sortBy) {
            case 'date':
              return (
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );

            case 'priority':
              const priorityOrder: Record<WatchlistPriority, number> = {
                high: 3,
                medium: 2,
                low: 1,
              };
              return priorityOrder[b.priority] - priorityOrder[a.priority];

            case 'title':
              const titleA = a.content?.title || '';
              const titleB = b.content?.title || '';
              return titleA.localeCompare(titleB);

            default:
              return 0;
          }
        });

        return sorted;
      },

      getWatchlistCount: () => {
        return get().watchlist.length;
      },

      getUnwatchedCount: () => {
        return get().watchlist.filter((item) => !item.watched).length;
      },

      isInWatchlist: (contentId: string) => {
        return get().watchlist.some((item) => item.content_id === contentId);
      },
    }),
    { name: 'WatchlistStore' }
  )
);
