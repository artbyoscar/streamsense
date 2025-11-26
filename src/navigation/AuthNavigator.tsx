import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { LoginScreen, RegisterScreen } from '@/features/auth';
import type { AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();

/**
 * Authentication Navigator
 * Handles login, registration, and password reset flows
 */
export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onForgotPassword={() => navigation.navigate('ForgotPassword')}
            onRegister={() => navigation.navigate('Register')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {({ navigation }) => <RegisterScreen onLogin={() => navigation.navigate('Login')} />}
      </Stack.Screen>
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordPlaceholder}
        options={{ headerShown: true, title: 'Reset Password' }}
      />
    </Stack.Navigator>
  );
};

/**
 * Placeholder for ForgotPassword screen
 * TODO: Implement full ForgotPassword screen
 */
const ForgotPasswordPlaceholder: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Forgot Password
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        This screen will be implemented soon
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    opacity: 0.7,
    textAlign: 'center',
  },
});
