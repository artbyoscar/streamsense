import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppProviders } from './src/providers';

function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text variant="displayMedium" style={styles.title}>
        StreamSense
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Subscription Tracking App
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <AppProviders>
      <HomeScreen />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
});
