/**
 * Subscription Form Screen
 * Add or edit a subscription with validation
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { Text, TextInput as PaperInput, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useSubscription,
  useCreateSubscription,
  useUpdateSubscription,
} from '../hooks/useSubscriptions';
import { fetchStreamingServices } from '@/services/streamingServices';
import { COLORS, Card, Button, LoadingScreen } from '@/components';
import { useTheme } from '@/providers/ThemeProvider';
import type { BillingCycle, StreamingService } from '@/types';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const subscriptionSchema = z.object({
  serviceId: z.string().nullable(),
  serviceName: z.string().min(1, 'Service name is required'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  billingCycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  nextBillingDate: z.date().nullable(),
  notes: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

// ============================================================================
// BILLING CYCLE OPTIONS
// ============================================================================

const BILLING_CYCLE_OPTIONS: Array<{ value: BillingCycle; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (Every 3 months)' },
  { value: 'yearly', label: 'Yearly (Annual)' },
];

// ============================================================================
// ROUTE PARAMS
// ============================================================================

type RouteParams = {
  SubscriptionForm: {
    subscriptionId?: string;
  };
};

// ============================================================================
// COMPONENT
// ============================================================================

export const SubscriptionFormScreen: React.FC = () => {
  // const navigation = useNavigation();
  // const route = useRoute<RouteProp<RouteParams, 'SubscriptionForm'>>();
  // const subscriptionId = route.params?.subscriptionId;
  const navigation = { goBack: () => { } }; // Mock
  const subscriptionId = undefined; // Mock
  const isEditMode = !!subscriptionId;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // State
  const [streamingServices, setStreamingServices] = useState<StreamingService[]>([]);
  const [serviceMenuVisible, setServiceMenuVisible] = useState(false);
  const [billingCycleMenuVisible, setBillingCycleMenuVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  // Queries & Mutations
  const { data: existingSubscription, isLoading: isLoadingSubscription } = useSubscription(
    subscriptionId || '',
    { enabled: isEditMode }
  );
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();

  // Form
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      serviceId: null,
      serviceName: '',
      price: 0,
      billingCycle: 'monthly',
      nextBillingDate: null,
      notes: '',
    },
    mode: 'onChange',
  });

  const selectedServiceId = watch('serviceId');
  const selectedServiceName = watch('serviceName');
  const selectedBillingCycle = watch('billingCycle');
  const selectedDate = watch('nextBillingDate');

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Load streaming services
  useEffect(() => {
    loadStreamingServices();
  }, []);

  // Pre-populate form when editing
  useEffect(() => {
    if (isEditMode && existingSubscription) {
      setValue('serviceId', existingSubscription.service_id);
      setValue('serviceName', existingSubscription.service_name);
      setValue('price', existingSubscription.price);
      setValue('billingCycle', existingSubscription.billing_cycle);
      setValue(
        'nextBillingDate',
        existingSubscription.next_billing_date
          ? new Date(existingSubscription.next_billing_date)
          : null
      );
      setValue('notes', existingSubscription.notes || '');
    }
  }, [isEditMode, existingSubscription, setValue]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const loadStreamingServices = async () => {
    try {
      setIsLoadingServices(true);
      const services = await fetchStreamingServices();
      setStreamingServices(services);
    } catch (error) {
      console.error('Error loading streaming services:', error);
      Alert.alert('Error', 'Failed to load streaming services');
    } finally {
      setIsLoadingServices(false);
    }
  };

  const handleServiceSelect = (service: StreamingService | null) => {
    if (service) {
      setValue('serviceId', service.id);
      setValue('serviceName', service.name);
      if (service.base_price) {
        setValue('price', service.base_price);
      }
    } else {
      // Custom service
      setValue('serviceId', null);
    }
    setServiceMenuVisible(false);
    setSearchQuery('');
  };

  const handleBillingCycleSelect = (cycle: BillingCycle) => {
    setValue('billingCycle', cycle, { shouldValidate: true });
    setBillingCycleMenuVisible(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setValue('nextBillingDate', selectedDate, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: SubscriptionFormData) => {
    try {
      const subscriptionData = {
        service_id: data.serviceId,
        service_name: data.serviceName,
        price: data.price,
        billing_cycle: data.billingCycle,
        next_billing_date: data.nextBillingDate?.toISOString() || null,
        notes: data.notes || null,
        status: 'active' as const,
        detected_from: 'manual' as const,
      };

      if (isEditMode && subscriptionId) {
        await updateMutation.mutateAsync({
          id: subscriptionId,
          updates: subscriptionData,
        });
        Alert.alert('Success', 'Subscription updated successfully');
      } else {
        await createMutation.mutateAsync(subscriptionData);
        Alert.alert('Success', 'Subscription added successfully');
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save subscription');
    }
  };

  // ========================================================================
  // FILTERED SERVICES
  // ========================================================================

  const filteredServices = streamingServices.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ========================================================================
  // LOADING STATE
  // ========================================================================

  if (isEditMode && isLoadingSubscription) {
    return <LoadingScreen message="Loading subscription..." />;
  }

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with SafeArea */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 44) + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditMode ? 'Edit Subscription' : 'Add Subscription'}
        </Text>
        <Pressable
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.formCard}>
          <Text style={styles.formSubtitle}>
            {isEditMode
              ? 'Update your subscription details'
              : 'Track a new streaming service or subscription'}
          </Text>

          <Divider style={styles.divider} />

          {/* Service Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Service <Text style={styles.required}>*</Text>
            </Text>

            <Menu
              visible={serviceMenuVisible}
              onDismiss={() => setServiceMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={[
                    styles.menuButton,
                    errors.serviceName && styles.menuButtonError,
                  ]}
                  onPress={() => setServiceMenuVisible(true)}
                >
                  <Text
                    style={[
                      styles.menuButtonText,
                      !selectedServiceName && styles.menuButtonPlaceholder,
                    ]}
                  >
                    {selectedServiceName || 'Select a service'}
                  </Text>
                  <MaterialCommunityIcons
                    name={serviceMenuVisible ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={COLORS.gray}
                  />
                </TouchableOpacity>
              }
            >
              <View style={styles.menuContent}>
                {/* Search Input */}
                <PaperInput
                  placeholder="Search services..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  mode="outlined"
                  style={styles.searchInput}
                  left={<PaperInput.Icon icon="magnify" />}
                />

                <ScrollView style={styles.menuScroll}>
                  {/* Filtered Services */}
                  {filteredServices.map((service) => (
                    <Menu.Item
                      key={service.id}
                      onPress={() => handleServiceSelect(service)}
                      title={service.name}
                      titleStyle={
                        selectedServiceId === service.id
                          ? styles.selectedMenuItem
                          : undefined
                      }
                    />
                  ))}

                  {/* Custom Service Option */}
                  <Divider />
                  <Menu.Item
                    onPress={() => handleServiceSelect(null)}
                    title="+ Add Custom Service"
                    titleStyle={styles.customMenuItem}
                  />
                </ScrollView>
              </View>
            </Menu>

            {errors.serviceName && (
              <Text style={styles.errorText}>{errors.serviceName.message}</Text>
            )}
          </View>

          {/* Custom Service Name (if no service selected) */}
          {selectedServiceId === null && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Custom Service Name <Text style={styles.required}>*</Text>
              </Text>
              <Controller
                control={control}
                name="serviceName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <PaperInput
                    mode="outlined"
                    placeholder="Enter service name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.serviceName}
                  />
                )}
              />
              {errors.serviceName && (
                <Text style={styles.errorText}>{errors.serviceName.message}</Text>
              )}
            </View>
          )}

          {/* Price Input */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Price <Text style={styles.required}>*</Text>
            </Text>
            <Controller
              control={control}
              name="price"
              render={({ field: { onChange, onBlur, value } }) => (
                <PaperInput
                  mode="outlined"
                  placeholder="0.00"
                  value={value > 0 ? value.toString() : ''}
                  onChangeText={(text) => {
                    const numValue = parseFloat(text.replace(/[^0-9.]/g, ''));
                    onChange(isNaN(numValue) ? 0 : numValue);
                  }}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  left={<PaperInput.Affix text="$" />}
                  error={!!errors.price}
                />
              )}
            />
            {errors.price && <Text style={styles.errorText}>{errors.price.message}</Text>}
          </View>

          {/* Billing Cycle Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Billing Cycle <Text style={styles.required}>*</Text>
            </Text>

            <Menu
              visible={billingCycleMenuVisible}
              onDismiss={() => setBillingCycleMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setBillingCycleMenuVisible(true)}
                >
                  <Text style={styles.menuButtonText}>
                    {BILLING_CYCLE_OPTIONS.find((opt) => opt.value === selectedBillingCycle)
                      ?.label || 'Select billing cycle'}
                  </Text>
                  <MaterialCommunityIcons
                    name={billingCycleMenuVisible ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={COLORS.gray}
                  />
                </TouchableOpacity>
              }
            >
              {BILLING_CYCLE_OPTIONS.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => handleBillingCycleSelect(option.value)}
                  title={option.label}
                  titleStyle={
                    selectedBillingCycle === option.value
                      ? styles.selectedMenuItem
                      : undefined
                  }
                />
              ))}
            </Menu>
          </View>

          {/* Next Billing Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Next Billing Date (Optional)</Text>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={[
                  styles.menuButtonText,
                  !selectedDate && styles.menuButtonPlaceholder,
                ]}
              >
                {selectedDate
                  ? selectedDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  : 'Select date'}
              </Text>
              <MaterialCommunityIcons name="calendar" size={24} color={COLORS.gray} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {selectedDate && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setValue('nextBillingDate', null)}
              >
                <Text style={styles.clearButtonText}>Clear date</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notes */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, onBlur, value } }) => (
                <PaperInput
                  mode="outlined"
                  placeholder="Add any notes about this subscription..."
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={4}
                  style={styles.notesInput}
                />
              )}
            />
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Button
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            loading={createMutation.isPending || updateMutation.isPending}
            disabled={!isValid}
            style={styles.actionButton}
          >
            {isEditMode ? 'Update Subscription' : 'Add Subscription'}
          </Button>

          <Button
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
          >
            Cancel
          </Button>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  formCard: {
    padding: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  divider: {
    marginVertical: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  menuButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.gray + '40',
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  menuButtonError: {
    borderColor: COLORS.error,
  },
  menuButtonText: {
    fontSize: 16,
    color: COLORS.darkGray,
  },
  menuButtonPlaceholder: {
    color: COLORS.gray,
  },
  menuContent: {
    maxHeight: 400,
    minWidth: 300,
  },
  searchInput: {
    marginHorizontal: 8,
    marginVertical: 8,
  },
  menuScroll: {
    maxHeight: 300,
  },
  selectedMenuItem: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  customMenuItem: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  clearButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 4,
  },
  actionsSection: {
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
