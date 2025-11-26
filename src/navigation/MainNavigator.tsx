/**
 * Minimal Test Navigator
 * Testing if the crash happens with plain React Native components
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const MainNavigator: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>App Loaded Successfully!</Text>
      <Text style={styles.subtext}>Authentication working</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});
