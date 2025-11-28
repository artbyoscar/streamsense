/**
 * Custom Navigation Context
 * Provides tab switching and screen navigation without react-navigation
 */

import React, { createContext, useContext, useState } from 'react';
import type { UnifiedContent } from '@/types';

type TabName = 'Home' | 'Watchlist' | 'Tips' | 'Settings';

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
  selectedContent: UnifiedContent | null;
  setSelectedContent: (content: UnifiedContent | null) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const useCustomNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    console.log('[Navigation] Context not available, using fallback');
    return {
      activeTab: 'Home' as TabName,
      setActiveTab: (tab: TabName) => console.log('[Navigation] Would navigate to:', tab),
      navigateToScreen: (screen: string) => console.log('[Navigation] Would open:', screen),
      showSubscriptionForm: false,
      setShowSubscriptionForm: (show: boolean) => console.log('[Navigation] Would show subscription form:', show),
      showContentSearch: false,
      setShowContentSearch: (show: boolean) => console.log('[Navigation] Would show content search:', show),
      showContentDetail: false,
      setShowContentDetail: (show: boolean) => console.log('[Navigation] Would show content detail:', show),
      showPlaidConnection: false,
      setShowPlaidConnection: (show: boolean) => console.log('[Navigation] Would show plaid connection:', show),
      selectedContent: null,
      setSelectedContent: (content: UnifiedContent | null) => console.log('[Navigation] Would select content:', content),
    };
  }
  return context;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [showContentSearch, setShowContentSearch] = useState(false);
  const [showContentDetail, setShowContentDetail] = useState(false);
  const [showPlaidConnection, setShowPlaidConnection] = useState(false);
  const [selectedContent, setSelectedContent] = useState<UnifiedContent | null>(null);

  const navigateToScreen = (screen: string, params?: any) => {
    // Handle modal screens or sub-screens here
    console.log('[Navigation] Navigate to screen:', screen, params);
    // For now, map screen names to tabs
    if (screen === 'SubscriptionForm') {
      console.log('[Navigation] Opening SubscriptionForm modal');
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
        selectedContent,
        setSelectedContent,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};
