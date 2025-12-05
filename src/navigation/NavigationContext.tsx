/**
 * Custom Navigation Context
 * Provides tab switching and screen navigation without react-navigation
 */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import type { UnifiedContent } from '@/types';

type TabName = 'Home' | 'Watchlist' | 'Discover' | 'Tips' | 'Settings';

interface NavigationContextType {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  navigateToScreen: (screen: string, params?: any) => void;
  showSubscriptionForm: boolean;
  setShowSubscriptionForm: (show: boolean) => void;
  showContentSearch: boolean;
  setShowContentSearch: (show: boolean) => void;
  showContentDetail: boolean;
  setShowContentDetail: (show: boolean) => void;
  showPlaidConnection: boolean;
  setShowPlaidConnection: (show: boolean) => void;
  showDebugRecommendations: boolean;
  setShowDebugRecommendations: (show: boolean) => void;
  selectedContent: UnifiedContent | null;
  setSelectedContent: (content: UnifiedContent | null) => void;
  selectedSubscriptionId: string | null;
  setSelectedSubscriptionId: (id: string | null) => void;
  selectedSubscription: any | null;
  setSelectedSubscription: (subscription: any | null) => void;
  showSubscriptionsManage: boolean;
  setShowSubscriptionsManage: (show: boolean) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  // New: callback for when content is added to watchlist
  onContentAdded: (() => void) | null;
  setOnContentAdded: (callback: (() => void) | null) => void;
  notifyContentAdded: () => void;
}

const defaultContext: NavigationContextType = {
  activeTab: 'Home',
  setActiveTab: () => console.log('[Navigation] Would set tab'),
  navigateToScreen: () => console.log('[Navigation] Would navigate'),
  showSubscriptionForm: false,
  setShowSubscriptionForm: () => console.log('[Navigation] Would show subscription form'),
  showContentSearch: false,
  setShowContentSearch: () => console.log('[Navigation] Would show content search'),
  showContentDetail: false,
  setShowContentDetail: () => console.log('[Navigation] Would show content detail'),
  showPlaidConnection: false,
  setShowPlaidConnection: () => console.log('[Navigation] Would show plaid connection'),
  showDebugRecommendations: false,
  setShowDebugRecommendations: () => console.log('[Navigation] Would show debug recommendations'),
  selectedContent: null,
  setSelectedContent: () => console.log('[Navigation] Would set content'),
  selectedSubscriptionId: null,
  setSelectedSubscriptionId: () => console.log('[Navigation] Would set subscription id'),
  selectedSubscription: null,
  setSelectedSubscription: () => console.log('[Navigation] Would set subscription'),
  showSubscriptionsManage: false,
  setShowSubscriptionsManage: () => console.log('[Navigation] Would show subscriptions manage'),
  refreshKey: 0,
  triggerRefresh: () => console.log('[Navigation] Would trigger refresh'),
  onContentAdded: null,
  setOnContentAdded: () => console.log('[Navigation] Would set content added callback'),
  notifyContentAdded: () => console.log('[Navigation] Would notify content added'),
};

const NavigationContext = createContext<NavigationContextType>(defaultContext);

export const useCustomNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    console.warn('[Navigation] useCustomNavigation must be used within NavigationProvider');
    return defaultContext;
  }
  return context;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [showContentSearch, setShowContentSearch] = useState(false);
  const [showContentDetail, setShowContentDetail] = useState(false);
  const [showPlaidConnection, setShowPlaidConnection] = useState(false);
  const [showDebugRecommendations, setShowDebugRecommendations] = useState(false);
  const [selectedContent, setSelectedContent] = useState<UnifiedContent | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<any | null>(null);
  const [showSubscriptionsManage, setShowSubscriptionsManage] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // New: callback ref for content added notifications
  const onContentAddedRef = useRef<(() => void) | null>(null);

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const setOnContentAdded = useCallback((callback: (() => void) | null) => {
    onContentAddedRef.current = callback;
  }, []);

  const notifyContentAdded = useCallback(() => {
    if (onContentAddedRef.current) {
      onContentAddedRef.current();
    }
  }, []);

  const navigateToScreen = (screen: string, params?: any) => {
    console.log('[Navigation] Navigate to screen:', screen, params);
    if (screen === 'SubscriptionForm') {
      console.log('[Navigation] Opening SubscriptionForm modal', params);
      if (params?.subscriptionId) {
        setSelectedSubscriptionId(params.subscriptionId);
        setSelectedSubscription(params.subscription || null);
      } else {
        setSelectedSubscriptionId(null);
        setSelectedSubscription(null);
      }
      setShowSubscriptionForm(true);
    } else if (screen === 'ContentSearch') {
      console.log('[Navigation] Opening ContentSearch modal');
      setShowContentSearch(true);
    } else if (screen === 'ContentDetail') {
      console.log('[Navigation] Opening ContentDetail modal');
      setShowContentDetail(true);
    } else if (screen === 'PlaidConnection') {
      console.log('[Navigation] Opening PlaidConnection modal');
      setShowPlaidConnection(true);
    } else if (screen === 'DebugRecommendations') {
      console.log('[Navigation] Opening DebugRecommendations modal');
      setShowDebugRecommendations(true);
    } else if (screen === 'SettingsTab' || screen === 'Settings') {
      setActiveTab('Settings');
    } else if (screen === 'WatchlistTab' || screen === 'Watchlist') {
      setActiveTab('Watchlist');
    } else if (screen === 'RecommendationsTab' || screen === 'Tips') {
      setActiveTab('Tips');
    }
  };

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        setActiveTab,
        navigateToScreen,
        showSubscriptionForm,
        setShowSubscriptionForm,
        showContentSearch,
        setShowContentSearch,
        showContentDetail,
        setShowContentDetail,
        showPlaidConnection,
        setShowPlaidConnection,
        showDebugRecommendations,
        setShowDebugRecommendations,
        selectedContent,
        setSelectedContent,
        selectedSubscriptionId,
        setSelectedSubscriptionId,
        selectedSubscription,
        setSelectedSubscription,
        showSubscriptionsManage,
        setShowSubscriptionsManage,
        refreshKey,
        triggerRefresh,
        onContentAdded: onContentAddedRef.current,
        setOnContentAdded,
        notifyContentAdded,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};
