/**
 * Custom Navigation Context
 * Provides tab switching and screen navigation without react-navigation
 */

import React, { createContext, useContext, useState } from 'react';

type TabName = 'Home' | 'Watchlist' | 'Tips' | 'Settings';

interface NavigationContextType {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  navigateToScreen: (screen: string, params?: any) => void;
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
    };
  }
  return context;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Home');

  const navigateToScreen = (screen: string, params?: any) => {
    // Handle modal screens or sub-screens here
    console.log('[Navigation] Navigate to screen:', screen, params);
    // For now, map screen names to tabs
    if (screen === 'SubscriptionForm') {
      console.log('[Navigation] Would open SubscriptionForm modal');
    } else if (screen === 'ContentSearch') {
      console.log('[Navigation] Would open ContentSearch modal');
    } else if (screen === 'SettingsTab' || screen === 'Settings') {
      setActiveTab('Settings');
    } else if (screen === 'WatchlistTab' || screen === 'Watchlist') {
      setActiveTab('Watchlist');
    } else if (screen === 'RecommendationsTab' || screen === 'Tips') {
      setActiveTab('Tips');
    }
  };

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab, navigateToScreen }}>
      {children}
    </NavigationContext.Provider>
  );
};
