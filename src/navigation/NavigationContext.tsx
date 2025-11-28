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
  showSubscriptionForm: boolean;
  setShowSubscriptionForm: (show: boolean) => void;
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
    };
  }
  return context;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);

  const navigateToScreen = (screen: string, params?: any) => {
    // Handle modal screens or sub-screens here
    console.log('[Navigation] Navigate to screen:', screen, params);
    // For now, map screen names to tabs
    if (screen === 'SubscriptionForm') {
      console.log('[Navigation] Opening SubscriptionForm modal');
      setShowSubscriptionForm(true);
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
    <NavigationContext.Provider value={{ activeTab, setActiveTab, navigateToScreen, showSubscriptionForm, setShowSubscriptionForm }}>
      {children}
    </NavigationContext.Provider>
  );
};
