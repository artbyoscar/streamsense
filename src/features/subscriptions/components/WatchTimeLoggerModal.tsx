/**
 * Watch Time Logger Modal
 * Allow users to log watch time for their subscriptions
 */

import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { logWatchTime } from '../services/subscriptionsService';
import { supabase } from '@/config/supabase';

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
  const [loadingCurrentHours, setLoadingCurrentHours] = useState(false);
  const [currentMonthHours, setCurrentMonthHours] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch current month's watch time when modal opens
  useEffect(() => {
    if (visible && subscription?.id) {
      fetchCurrentMonthHours();
    }
  }, [visible, subscription?.id]);

  const fetchCurrentMonthHours = async () => {
    if (!subscription?.id) return;

    setLoadingCurrentHours(true);
    try {
      // Get current month's start and end dates
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('watch_time_logs')
        .select('hours, date')
        .eq('subscription_id', subscription.id)
        .gte('date', monthStart.toISOString())
        .lte('date', monthEnd.toISOString())
        .order('date', { ascending: false });

      if (error) throw error;

      const totalHours = data?.reduce((sum, log) => sum + (log.hours || 0), 0) || 0;
      setCurrentMonthHours(totalHours);

      // Set last updated timestamp
      if (data && data.length > 0) {
        setLastUpdated(data[0].date);
      } else {
        setLastUpdated(null);
      }
    } catch (error) {
      console.error('[WatchTime] Error fetching current hours:', error);
    } finally {
      setLoadingCurrentHours(false);
    }
  };

  const handleQuickAdd = (quickHours: number) => {
    setHours(quickHours.toString());
  };

  const handleSave = async () => {
    const hoursNum = parseFloat(hours);

    // Validation - must be non-negative (matches database constraint)
    if (isNaN(hoursNum) || hoursNum < 0) {
      Alert.alert('Invalid Hours', 'Please enter a valid number of hours (minimum 0)');
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

      const newTotal = currentMonthHours + hoursNum;
      Alert.alert(
        'Success',
        `Added ${hoursNum} hour${hoursNum === 1 ? '' : 's'}!\n\nNew total this month: ${newTotal.toFixed(1)} hours`,
        [{
          text: 'OK', onPress: () => {
            setHours('');
            setContentWatched('');
            setCurrentMonthHours(newTotal); // Update local state
            onSave();
            onClose();
          }
        }]
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

          {/* Billing Period Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoText, { color: colors.text }]}>
                Tracking for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <Text style={[styles.infoSubtext, { color: colors.textSecondary }]}>
                Your watch time resets each month
              </Text>
            </View>
          </View>

          {/* Current Month Total */}
          {loadingCurrentHours ? (
            <View style={styles.currentTotalLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.currentTotalText, { color: colors.textSecondary }]}>
                Loading current total...
              </Text>
            </View>
          ) : (
            <View style={[styles.currentTotalCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
              <View style={styles.currentTotalRow}>
                <Text style={[styles.currentTotalLabel, { color: colors.text }]}>
                  Current Total:
                </Text>
                <Text style={[styles.currentTotalValue, { color: colors.primary }]}>
                  {currentMonthHours.toFixed(1)} hours
                </Text>
              </View>
              {lastUpdated && (
                <Text style={[styles.lastUpdatedText, { color: colors.textSecondary }]}>
                  Last updated: {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </Text>
              )}
            </View>
          )}

          {/* Hours Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Add Hours <Text style={{ color: colors.error }}>*</Text>
            </Text>

            {/* Quick Add Buttons */}
            <View style={styles.quickAddRow}>
              {[1, 2, 4, 8].map((quickHours) => (
                <TouchableOpacity
                  key={quickHours}
                  style={[
                    styles.quickAddButton,
                    {
                      backgroundColor: hours === quickHours.toString() ? colors.primary : colors.background,
                      borderColor: colors.border,
                    }
                  ]}
                  onPress={() => handleQuickAdd(quickHours)}
                >
                  <Text style={[
                    styles.quickAddText,
                    { color: hours === quickHours.toString() ? '#FFFFFF' : colors.text }
                  ]}>
                    {quickHours}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              This will be added to your current total (max 24 hours per entry)
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
              disabled={saving || !hours}
            >
              {saving ? (
                <Text style={styles.saveText}>Adding...</Text>
              ) : (
                <>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.saveText}>
                    {hours ? `Add ${hours} Hour${parseFloat(hours) === 1 ? '' : 's'}` : 'Add Hours'}
                  </Text>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoSubtext: {
    fontSize: 12,
  },
  currentTotalLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  currentTotalText: {
    fontSize: 14,
  },
  currentTotalCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  currentTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentTotalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  lastUpdatedText: {
    fontSize: 11,
    marginTop: 4,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickAddButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickAddText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
