import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { enableScreens } from 'react-native-screens';

// Disable native screens - fall back to JS implementation
enableScreens(false);

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563EB',
  },
};

const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home</Text>
    </View>
  );
}

function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings</Text>
    </View>
  );
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
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
});
