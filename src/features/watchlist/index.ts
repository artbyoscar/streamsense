/**
 * Watchlist Feature Exports
 */

// Screens
export { ContentSearchScreen } from './screens/ContentSearchScreen';
export { WatchlistScreen } from './screens/WatchlistScreen';

// Store
export { useWatchlistStore } from './store/watchlistStore';
export type { SortOption, FilterOption } from './store/watchlistStore';

// Services
export * as watchlistService from './services/watchlistService';
