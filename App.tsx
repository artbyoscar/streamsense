import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>StreamSense Test</Text>
      <Text style={styles.subtext}>If you see this, basic rendering works!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  subtext: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
  },
});
