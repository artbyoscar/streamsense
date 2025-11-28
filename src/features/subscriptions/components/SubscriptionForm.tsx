/**
 * Subscription Form Component
 * Form for adding/editing user subscriptions
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

// Common streaming services
const STREAMING_SERVICES = [
  'Netflix',
  'Hulu',
  'Disney+',
  'HBO Max',
  'Amazon Prime Video',
  'Apple TV+',
  'Paramount+',
  'Peacock',
  'Discovery+',
  'YouTube Premium',
  'Spotify',
  'Apple Music',
  'Other',
];

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (3 months)' },
  { value: 'yearly', label: 'Yearly' },
];

interface SubscriptionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const SubscriptionForm: React.FC<SubscriptionFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);

  // Form state
  const [serviceName, setServiceName] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [price, setPrice] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [billingDay, setBillingDay] = useState('1');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string>> = {};

    // Service name validation
    if (!serviceName) {
      newErrors.serviceName = 'Please select a service';
    } else if (serviceName === 'Other' && !customServiceName.trim()) {
      newErrors.customServiceName = 'Please enter a service name';
    }

    // Price validation
    if (!price || parseFloat(price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    // Billing day validation
    const day = parseInt(billingDay);
    if (!billingDay || day < 1 || day > 31) {
      newErrors.billingDay = 'Please enter a day between 1 and 31';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate next billing date
  const calculateNextBillingDate = (): string => {
    const today = new Date();
    const day = parseInt(billingDay);

    // Start with current month
    let nextDate = new Date(today.getFullYear(), today.getMonth(), day);

    // If the day already passed this month, move to next month
    if (nextDate <= today) {
      nextDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }

    // Handle months with fewer days (e.g., day 31 in February)
    while (nextDate.getDate() !== day) {
      nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
    }

    return nextDate.toISOString().split('T')[0];
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a subscription');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalServiceName = serviceName === 'Other' ? customServiceName.trim() : serviceName;
      const nextBillingDate = calculateNextBillingDate();

      const { error } = await supabase.from('user_subscriptions').insert({
        user_id: user.id,
        service_name: finalServiceName,
        price: parseFloat(price),
        billing_cycle: billingCycle,
        next_billing_date: nextBillingDate,
        notes: notes.trim() || null,
        detected_from: 'manual',
        status: 'active',
      });

      if (error) throw error;

      Alert.alert('Success', 'Subscription added successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error adding subscription:', error);
      Alert.alert('Error', 'Failed to add subscription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Service Selection */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Streaming Service *
        </Text>
        <View style={styles.serviceGrid}>
          {STREAMING_SERVICES.map((service) => (
            <TouchableOpacity
              key={service}
              style={[
                styles.serviceButton,
                {
                  backgroundColor: serviceName === service ? colors.primary : colors.card,
                  borderColor: serviceName === service ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setServiceName(service)}
            >
              <Text
                style={[
                  styles.serviceButtonText,
                  { color: serviceName === service ? colors.white : colors.text },
                ]}
              >
                {service}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.serviceName && (
          <Text style={[styles.error, { color: colors.error }]}>{errors.serviceName}</Text>
        )}
      </View>

      {/* Custom Service Name (if Other selected) */}
      {serviceName === 'Other' && (
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Service Name *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: errors.customServiceName ? colors.error : colors.border,
                color: colors.text,
              },
            ]}
            value={customServiceName}
            onChangeText={setCustomServiceName}
            placeholder="Enter service name"
            placeholderTextColor={colors.textSecondary}
          />
          {errors.customServiceName && (
            <Text style={[styles.error, { color: colors.error }]}>{errors.customServiceName}</Text>
          )}
        </View>
      )}

      {/* Price */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Monthly Cost *
        </Text>
        <View style={styles.priceInputContainer}>
          <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
          <TextInput
            style={[
              styles.priceInput,
              {
                backgroundColor: colors.card,
                borderColor: errors.price ? colors.error : colors.border,
                color: colors.text,
              },
            ]}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>
        {errors.price && (
          <Text style={[styles.error, { color: colors.error }]}>{errors.price}</Text>
        )}
      </View>

      {/* Billing Cycle */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Billing Cycle
        </Text>
        <View style={styles.billingCycleContainer}>
          {BILLING_CYCLES.map((cycle) => (
            <TouchableOpacity
              key={cycle.value}
              style={[
                styles.cycleButton,
                {
                  backgroundColor: billingCycle === cycle.value ? colors.primary : colors.card,
                  borderColor: billingCycle === cycle.value ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setBillingCycle(cycle.value)}
            >
              <Text
                style={[
                  styles.cycleButtonText,
                  { color: billingCycle === cycle.value ? colors.white : colors.text },
                ]}
              >
                {cycle.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Billing Day */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Billing Day of Month *
        </Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Day when your subscription renews each month (1-31)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: errors.billingDay ? colors.error : colors.border,
              color: colors.text,
            },
          ]}
          value={billingDay}
          onChangeText={setBillingDay}
          placeholder="1"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          maxLength={2}
        />
        {errors.billingDay && (
          <Text style={[styles.error, { color: colors.error }]}>{errors.billingDay}</Text>
        )}
      </View>

      {/* Notes */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.text }]}>
          Notes (Optional)
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes about this subscription..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton, { backgroundColor: colors.card }]}
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.white }]}>
              Add Subscription
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  serviceButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  billingCycleContainer: {
    gap: 8,
  },
  cycleButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cycleButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  error: {
    fontSize: 13,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
