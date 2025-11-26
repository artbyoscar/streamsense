/**
 * useNetworkStatus Hook
 * Monitor network connectivity status
 */

import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  isOffline: boolean;
}

/**
 * Hook to monitor network connectivity
 *
 * @example
 * const { isConnected, isOffline } = useNetworkStatus();
 *
 * if (isOffline) {
 *   showOfflineMessage();
 * }
 *
 * @example
 * // Use with queries
 * const { isOffline } = useNetworkStatus();
 * const { data, error } = useQuery({
 *   queryKey: ['subscriptions'],
 *   queryFn: fetchSubscriptions,
 *   enabled: !isOffline, // Only fetch when online
 * });
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
    isOffline: false,
  });

  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      updateNetworkStatus(state);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      updateNetworkStatus(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateNetworkStatus = (state: NetInfoState) => {
    const isConnected = state.isConnected ?? false;
    const isInternetReachable = state.isInternetReachable ?? null;
    const isOffline = !isConnected || isInternetReachable === false;

    setNetworkStatus({
      isConnected,
      isInternetReachable,
      type: state.type,
      isOffline,
    });
  };

  return networkStatus;
};
