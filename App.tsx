import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <View style={styles.container}>
        <Text style={styles.text}>StreamSense Test</Text>
        <Text style={styles.subtext}>ThemeProvider works!</Text>
      </View>
    </PaperProvider>
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
