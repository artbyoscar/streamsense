/**
 * Watch Time Logger Modal
 * Allow users to log watch time for their subscriptions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { logWatchTime } from '../services/subscriptionsService';

interface WatchTimeLoggerModalProps {
  visible: boolean;
  subscription: any | null;
  onClose: () => void;
  onSave: () => void;
}

export const WatchTimeLoggerModal: React.FC<WatchTimeLoggerModalProps> = ({
  visible,
  subscription,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  const [hours, setHours] = useState('');
  const [contentWatched, setContentWatched] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const hoursNum = parseFloat(hours);

    // Validation - allow 0, reject NaN and negative numbers
    if (isNaN(hoursNum) || hoursNum < 0) {
      Alert.alert('Invalid Hours', 'Please enter a valid number of hours (0 or greater)');
      return;
    }

    if (hoursNum > 24) {
      Alert.alert('Invalid Hours', 'Please enter a reasonable number of hours (max 24 per day)');
      return;
    }

    // Validate subscription ID before attempting to save
    if (!subscription?.id || subscription.id === 'undefined' || subscription.id.length !== 36) {
      console.error('[WatchTime] Invalid subscription ID:', subscription?.id);
      Alert.alert('Error', 'Invalid subscription. Please try again.');
      return;
    }

    try {
      setSaving(true);

      console.log('[WatchTime] Saving watch time for subscription:', subscription.id);
      await logWatchTime({
        subscriptionId: subscription.id,
        hours: hoursNum,
        date: new Date().toISOString(),
        contentDescription: contentWatched.trim() || undefined,
      });

      Alert.alert(
        'Success',
        `Logged ${hoursNum} hour${hoursNum === 1 ? '' : 's'} of watch time!`,
        [{ text: 'OK', onPress: () => {
          setHours('');
          setContentWatched('');
          onSave();
          onClose();
        }}]
      );
    } catch (error) {
      console.error('[WatchTime] Error saving:', error);
      Alert.alert('Error', 'Failed to log watch time. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setHours('');
    setContentWatched('');
    onClose();
  };

  if (!subscription) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="time" size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Log Watch Time
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Service Label */}
          <View style={[styles.serviceTag, { backgroundColor: colors.background }]}>
            <Ionicons name="play-circle" size={16} color={colors.primary} />
            <Text style={[styles.serviceLabel, { color: colors.text }]}>
              {subscription.service_name}
            </Text>
          </View>

          {/* Hours Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Hours Watched <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              keyboardType="decimal-pad"
              value={hours}
              onChangeText={setHours}
              placeholder="e.g., 2.5"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Enter the number of hours you watched today
            </Text>
          </View>

          {/* Content Description Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              What did you watch? <Text style={[styles.optional, { color: colors.textSecondary }]}>(optional)</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={contentWatched}
              onChangeText={setContentWatched}
              placeholder="e.g., The Office S3E1-E5"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.background }]}
              onPress={handleClose}
              disabled={saving}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Text style={styles.saveText}>Saving...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.saveText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  serviceLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  optional: {
    fontWeight: '400',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    marginTop: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
