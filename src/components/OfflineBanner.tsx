/**
 * Offline Banner Component
 * Shows a banner when the device is offline
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Animated, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '@/providers/ThemeProvider';
import { COLORS } from './theme';

export const OfflineBanner: React.FC = () => {
  const { colors } = useTheme();
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-60));

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Animate banner in/out
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: colors.error,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="wifi-off"
          size={20}
          color={colors.white}
          style={styles.icon}
        />
        <Text style={[styles.text, { color: colors.white }]}>No internet connection</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.error,
    zIndex: 9999,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
