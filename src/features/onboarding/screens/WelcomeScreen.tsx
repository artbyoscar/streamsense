/**
 * Welcome Screen - Step 1 of Onboarding
 * App introduction with value proposition
 */

import React from 'react';
import { StyleSheet, View, ScrollView, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, Button } from '@/components';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const VALUE_PROPS = [
  {
    icon: 'wallet-outline' as const,
    title: 'Track All Subscriptions',
    description: 'Automatically detect and manage all your streaming services in one place',
    color: COLORS.primary,
  },
  {
    icon: 'chart-line' as const,
    title: 'Smart Insights',
    description: 'Get personalized recommendations to save money and optimize your subscriptions',
    color: '#10B981',
  },
  {
    icon: 'bell-ring' as const,
    title: 'Never Miss a Renewal',
    description: 'Receive alerts before your subscriptions renew so you\'re always in control',
    color: '#F59E0B',
  },
  {
    icon: 'lightbulb-on' as const,
    title: 'Cut Unnecessary Costs',
    description: 'Discover unused subscriptions and find better bundle deals',
    color: '#8B5CF6',
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="television-play" size={72} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>StreamSense</Text>
        <Text style={styles.tagline}>
          Take Control of Your Streaming Subscriptions
        </Text>
      </View>

      {/* Value Propositions */}
      <View style={styles.valuePropsSection}>
        {VALUE_PROPS.map((prop, index) => (
          <View key={index} style={styles.valueProp}>
            <View style={[styles.valueIcon, { backgroundColor: `${prop.color}15` }]}>
              <MaterialCommunityIcons name={prop.icon} size={28} color={prop.color} />
            </View>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>{prop.title}</Text>
              <Text style={styles.valueDescription}>{prop.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={onGetStarted}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Get Started
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 26,
  },
  valuePropsSection: {
    paddingHorizontal: 24,
    gap: 24,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  valueIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  valueContent: {
    flex: 1,
    paddingTop: 4,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  valueDescription: {
    fontSize: 15,
    color: COLORS.gray,
    lineHeight: 22,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginTop: 40,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
