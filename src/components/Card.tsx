/**
 * Card Component
 * Container card with shadow and optional header
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Card as PaperCard, Text } from 'react-native-paper';
import { useTheme } from '@/providers/ThemeProvider';
import { COLORS } from './theme';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  elevation?: number;
  testID?: string;
}

export const Card: React.FC<CardProps> = React.memo(({
  children,
  title,
  subtitle,
  headerRight,
  onPress,
  style,
  elevation = 2,
  testID,
}) => {
  const { colors } = useTheme();
  const hasHeader = title || subtitle || headerRight;

  const CardContent = (
    <>
      {hasHeader && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
            {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}
      <PaperCard.Content style={hasHeader && styles.contentWithHeader}>
        {children}
      </PaperCard.Content>
    </>
  );

  if (onPress) {
    return (
      <PaperCard
        style={[styles.card, { backgroundColor: colors.card }, style]}
        elevation={elevation}
        onPress={onPress}
        testID={testID}
      >
        {CardContent}
      </PaperCard>
    );
  }

  return (
    <PaperCard style={[styles.card, { backgroundColor: colors.card }, style]} elevation={elevation} testID={testID}>
      {CardContent}
    </PaperCard>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  contentWithHeader: {
    paddingTop: 16,
  },
});
