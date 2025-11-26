import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  useTheme,
  HelperText,
  IconButton,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks';
import { loginSchema, type LoginFormData } from '../schemas/validation';
import { logger } from '@/utils';
import { useAuthScreen } from '../../../../App';

interface LoginScreenProps {
  onForgotPassword?: () => void;
  onRegister?: () => void;
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onForgotPassword,
  onRegister,
  onLoginSuccess,
}) => {
  const theme = useTheme();
  const { login, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const { setShowRegister } = useAuthScreen();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Clear errors when component mounts or when user starts typing
  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      logger.debug('[LoginScreen] Attempting login', { email: data.email });
      clearError();

      await login({
        email: data.email,
        password: data.password,
      });

      logger.info('[LoginScreen] Login successful');

      // Reset form on successful login
      reset();

      // Callback for navigation or other actions
      onLoginSuccess?.();
    } catch (err: any) {
      logger.error('[LoginScreen] Login failed', err);
      // Error is already set in the auth store
    }
  };

  const handleForgotPassword = () => {
    clearError();
    onForgotPassword?.();
  };

  const handleRegister = () => {
    clearError();
    setShowRegister(true);
    onRegister?.();
  };

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
            Welcome Back
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Sign in to continue to StreamSense
          </Text>
        </View>

        {/* Login Form */}
        <Surface style={styles.formContainer} elevation={1}>
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
                    autoComplete="password"
                    textContentType="password"
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

          {/* Auth Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Surface style={styles.errorSurface} elevation={0}>
                <Text variant="bodyMedium" style={styles.errorText}>
                  {error.message || 'An error occurred during login. Please try again.'}
                </Text>
              </Surface>
            </View>
          )}

          {/* Forgot Password Link */}
          <View style={styles.forgotPasswordContainer}>
            <Button mode="text" onPress={handleForgotPassword} disabled={isLoading} compact>
              Forgot Password?
            </Button>
          </View>

          {/* Login Button */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
          >
            Sign In
          </Button>
        </Surface>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text variant="bodyMedium" style={styles.registerText}>
            Don't have an account?{' '}
          </Text>
          <Button mode="text" onPress={handleRegister} disabled={isLoading} compact>
            Sign Up
          </Button>
        </View>

        {/* Divider with OR */}
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text variant="bodySmall" style={styles.dividerText}>
            OR
          </Text>
          <View style={styles.divider} />
        </View>

        {/* Social Login Placeholder */}
        <View style={styles.socialContainer}>
          <Button
            mode="outlined"
            icon="google"
            onPress={() => {
              // TODO: Implement Google sign in
              logger.info('[LoginScreen] Google sign in clicked');
            }}
            disabled={isLoading}
            style={styles.socialButton}
          >
            Continue with Google
          </Button>

          <Button
            mode="outlined"
            icon="apple"
            onPress={() => {
              // TODO: Implement Apple sign in
              logger.info('[LoginScreen] Apple sign in clicked');
            }}
            disabled={isLoading}
            style={styles.socialButton}
          >
            Continue with Apple
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    opacity: 0.7,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    opacity: 0.5,
  },
  socialContainer: {
    gap: 12,
  },
  socialButton: {
    marginBottom: 8,
  },
});
