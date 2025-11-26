import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  useTheme,
  HelperText,
  Checkbox,
  Divider,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks';
import { registerSchema, type RegisterFormData } from '../schemas/validation';
import { logger } from '@/utils';

interface RegisterScreenProps {
  onLogin?: () => void;
  onRegisterSuccess?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onLogin, onRegisterSuccess }) => {
  const theme = useTheme();
  const { register, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: RegisterFormData) => {
    // Validate terms acceptance
    if (!acceptTerms) {
      setTermsError(true);
      return;
    }

    try {
      logger.debug('[RegisterScreen] Attempting registration', { email: data.email });
      clearError();
      setTermsError(false);

      await register({
        email: data.email,
        password: data.password,
        metadata: {
          full_name: data.fullName,
        },
      });

      logger.info('[RegisterScreen] Registration successful');

      // Save email for success message
      setUserEmail(data.email);

      // Reset form
      reset();
      setAcceptTerms(false);

      // Show success message
      setRegistrationSuccess(true);

      // Callback for navigation or other actions
      onRegisterSuccess?.();
    } catch (err: any) {
      logger.error('[RegisterScreen] Registration failed', err);
      // Error is already set in the auth store
    }
  };

  const handleLogin = () => {
    clearError();
    setRegistrationSuccess(false);
    onLogin?.();
  };

  // Success state - ask user to verify email
  if (registrationSuccess) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Surface style={styles.successContainer} elevation={1}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>

            <Text variant="headlineMedium" style={styles.successTitle}>
              Check Your Email
            </Text>

            <Text variant="bodyLarge" style={styles.successMessage}>
              We've sent a verification link to
            </Text>

            <Text variant="bodyLarge" style={[styles.successMessage, styles.emailText]}>
              {userEmail}
            </Text>

            <Text variant="bodyMedium" style={styles.successInstructions}>
              Please check your inbox and click the verification link to activate your account.
            </Text>

            <Divider style={styles.divider} />

            <Text variant="bodySmall" style={styles.notReceived}>
              Didn't receive the email? Check your spam folder or try registering again.
            </Text>

            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.backToLoginButton}
              contentStyle={styles.buttonContent}
            >
              Back to Login
            </Button>
          </Surface>
        </ScrollView>
      </View>
    );
  }

  // Registration form
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>
            Create Account
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Sign up to start tracking your subscriptions
          </Text>
        </View>

        {/* Registration Form */}
        <Surface style={styles.formContainer} elevation={1}>
          {/* Full Name Input */}
          <View style={styles.inputContainer}>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <TextInput
                    label="Full Name"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.fullName}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    left={<TextInput.Icon icon="account" />}
                    disabled={isLoading}
                  />
                  {errors.fullName && (
                    <HelperText type="error" visible={!!errors.fullName}>
                      {errors.fullName.message}
                    </HelperText>
                  )}
                </>
              )}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <TextInput
                    label="Email"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    left={<TextInput.Icon icon="email" />}
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <HelperText type="error" visible={!!errors.email}>
                      {errors.email.message}
                    </HelperText>
                  )}
                </>
              )}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <TextInput
                    label="Password"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.password}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password-new"
                    textContentType="newPassword"
                    left={<TextInput.Icon icon="lock" />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                    disabled={isLoading}
                  />
                  {errors.password && (
                    <HelperText type="error" visible={!!errors.password}>
                      {errors.password.message}
                    </HelperText>
                  )}
                </>
              )}
            />
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <TextInput
                    label="Confirm Password"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.confirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoComplete="password-new"
                    textContentType="newPassword"
                    left={<TextInput.Icon icon="lock-check" />}
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    }
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && (
                    <HelperText type="error" visible={!!errors.confirmPassword}>
                      {errors.confirmPassword.message}
                    </HelperText>
                  )}
                </>
              )}
            />
          </View>

          {/* Password Requirements */}
          <View style={styles.passwordRequirements}>
            <Text variant="bodySmall" style={styles.requirementsTitle}>
              Password must contain:
            </Text>
            <Text variant="bodySmall" style={styles.requirementItem}>
              • At least 8 characters
            </Text>
            <Text variant="bodySmall" style={styles.requirementItem}>
              • One uppercase letter
            </Text>
            <Text variant="bodySmall" style={styles.requirementItem}>
              • One lowercase letter
            </Text>
            <Text variant="bodySmall" style={styles.requirementItem}>
              • One number
            </Text>
          </View>

          {/* Auth Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Surface style={styles.errorSurface} elevation={0}>
                <Text variant="bodyMedium" style={styles.errorText}>
                  {error.message || 'An error occurred during registration. Please try again.'}
                </Text>
              </Surface>
            </View>
          )}

          {/* Terms of Service Checkbox */}
          <View style={styles.termsContainer}>
            <Checkbox
              status={acceptTerms ? 'checked' : 'unchecked'}
              onPress={() => {
                setAcceptTerms(!acceptTerms);
                setTermsError(false);
              }}
              disabled={isLoading}
            />
            <Text
              variant="bodyMedium"
              style={[styles.termsText, termsError && styles.termsTextError]}
              onPress={() => {
                setAcceptTerms(!acceptTerms);
                setTermsError(false);
              }}
            >
              I agree to the <Text style={styles.termsLink}>Terms of Service</Text>
              {' and '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          {termsError && (
            <HelperText type="error" visible={termsError}>
              You must accept the terms and conditions to continue
            </HelperText>
          )}

          {/* Register Button */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.registerButton}
            contentStyle={styles.buttonContent}
          >
            Create Account
          </Button>
        </Surface>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text variant="bodyMedium" style={styles.loginText}>
            Already have an account?{' '}
          </Text>
          <Button mode="text" onPress={handleLogin} disabled={isLoading} compact>
            Sign In
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    opacity: 0.7,
    textAlign: 'center',
  },
  formContainer: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 8,
  },
  passwordRequirements: {
    marginTop: 8,
    marginBottom: 16,
    paddingLeft: 12,
  },
  requirementsTitle: {
    opacity: 0.7,
    marginBottom: 4,
    fontWeight: '600',
  },
  requirementItem: {
    opacity: 0.6,
    marginLeft: 8,
  },
  errorContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  errorSurface: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: '#C62828',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  termsText: {
    flex: 1,
    marginLeft: 8,
  },
  termsTextError: {
    color: '#C62828',
  },
  termsLink: {
    color: '#6750A4',
    fontWeight: '600',
  },
  registerButton: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    opacity: 0.7,
  },
  // Success state styles
  successContainer: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  successTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 8,
  },
  emailText: {
    fontWeight: '600',
    color: '#6750A4',
    marginBottom: 16,
  },
  successInstructions: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  divider: {
    width: '100%',
    marginVertical: 24,
  },
  notReceived: {
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  backToLoginButton: {
    width: '100%',
  },
});
