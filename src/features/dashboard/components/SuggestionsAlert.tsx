/**
 * Suggestions Alert Component
 * Displays banner for pending subscription detections
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/components';

interface SuggestionsAlertProps {
  count: number;
  onPress: () => void;
  onDismiss?: () => void;
}

export const SuggestionsAlert: React.FC<SuggestionsAlertProps> = ({
  count,
  onPress,
  onDismiss,
}) => {
  if (count === 0) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="bell-alert"
          size={24}
          color={COLORS.warning}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          {count} Subscription{count > 1 ? 's' : ''} Detected
        </Text>
        <Text style={styles.message}>
          We found {count} potential subscription{count > 1 ? 's' : ''} from your
          transactions. Tap to review.
        </Text>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={COLORS.warning}
      />

      {onDismiss && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="close" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warning,
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
