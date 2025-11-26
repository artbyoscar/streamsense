import Constants from 'expo-constants';
import type {
  EnvironmentConfig,
  EnvValidationError,
  AppEnvironment,
  PlaidEnvironment,
} from '@/types/env';

/**
 * Get environment variable with optional default value
 */
function getEnvVar(key: string, defaultValue?: string): string | undefined {
  const value = Constants.expoConfig?.extra?.[key] || process.env[key];
  return value || defaultValue;
}

/**
 * Get required environment variable
 * Throws error if variable is missing or empty
 */
function getRequiredEnvVar(key: string): string {
  const value = getEnvVar(key);

  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Please add ${key} to your .env file.\n` +
        `See .env.example for reference.`
    );
  }

  return value;
}

/**
 * Validate environment configuration
 * Returns array of validation errors
 */
function validateEnv(): EnvValidationError[] {
  const errors: EnvValidationError[] = [];

  // Required: Supabase URL
  const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseUrl) {
    errors.push({
      variable: 'EXPO_PUBLIC_SUPABASE_URL',
      message: 'Supabase URL is required',
    });
  } else if (!supabaseUrl.startsWith('https://')) {
    errors.push({
      variable: 'EXPO_PUBLIC_SUPABASE_URL',
      message: 'Supabase URL must start with https://',
    });
  }

  // Required: Supabase Anon Key
  const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseAnonKey) {
    errors.push({
      variable: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      message: 'Supabase anon key is required',
    });
  }

  // Optional but validate if present: Plaid
  const plaidClientId = getEnvVar('EXPO_PUBLIC_PLAID_CLIENT_ID');
  const plaidSecret = getEnvVar('EXPO_PUBLIC_PLAID_SECRET');
  const plaidEnv = getEnvVar('EXPO_PUBLIC_PLAID_ENV');

  if (plaidClientId || plaidSecret || plaidEnv) {
    if (!plaidClientId) {
      errors.push({
        variable: 'EXPO_PUBLIC_PLAID_CLIENT_ID',
        message: 'Plaid client ID is required when using Plaid',
      });
    }
    if (!plaidSecret) {
      errors.push({
        variable: 'EXPO_PUBLIC_PLAID_SECRET',
        message: 'Plaid secret is required when using Plaid',
      });
    }
    if (plaidEnv && !['sandbox', 'development', 'production'].includes(plaidEnv)) {
      errors.push({
        variable: 'EXPO_PUBLIC_PLAID_ENV',
        message: 'Plaid environment must be sandbox, development, or production',
      });
    }
  }

  // Validate app environment
  const appEnv = getEnvVar('EXPO_PUBLIC_APP_ENV', 'development');
  if (appEnv && !['development', 'staging', 'production'].includes(appEnv)) {
    errors.push({
      variable: 'EXPO_PUBLIC_APP_ENV',
      message: 'App environment must be development, staging, or production',
    });
  }

  return errors;
}

/**
 * Load and validate environment configuration
 * Throws error if required variables are missing
 */
function loadEnv(): EnvironmentConfig {
  const errors = validateEnv();

  if (errors.length > 0) {
    const errorMessage = errors.map(err => `  - ${err.variable}: ${err.message}`).join('\n');

    throw new Error(
      `❌ Environment Configuration Error:\n\n${errorMessage}\n\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `See .env.example for reference.`
    );
  }

  // Build configuration object
  const config: EnvironmentConfig = {
    supabase: {
      url: getRequiredEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
      anonKey: getRequiredEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    },
    app: {
      env: (getEnvVar('EXPO_PUBLIC_APP_ENV', 'development') as AppEnvironment) || 'development',
      debug: getEnvVar('EXPO_PUBLIC_DEBUG', 'false') === 'true',
    },
  };

  // Add optional Plaid config if all required fields are present
  const plaidClientId = getEnvVar('EXPO_PUBLIC_PLAID_CLIENT_ID');
  const plaidSecret = getEnvVar('EXPO_PUBLIC_PLAID_SECRET');
  const plaidEnv = getEnvVar('EXPO_PUBLIC_PLAID_ENV', 'sandbox') as PlaidEnvironment;

  if (plaidClientId && plaidSecret) {
    config.plaid = {
      clientId: plaidClientId,
      secret: plaidSecret,
      env: plaidEnv || 'sandbox',
    };
  }

  // Add optional TMDB config if present
  const tmdbApiKey = getEnvVar('EXPO_PUBLIC_TMDB_API_KEY');
  if (tmdbApiKey) {
    config.tmdb = {
      apiKey: tmdbApiKey,
    };
  }

  return config;
}

/**
 * Check if a feature is enabled based on environment configuration
 */
export function isFeatureEnabled(feature: 'plaid' | 'tmdb'): boolean {
  try {
    const config = loadEnv();

    switch (feature) {
      case 'plaid':
        return !!config.plaid;
      case 'tmdb':
        return !!config.tmdb;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Get safe environment info for logging (without sensitive data)
 */
export function getSafeEnvInfo() {
  const config = loadEnv();

  return {
    app: config.app,
    features: {
      plaid: !!config.plaid,
      tmdb: !!config.tmdb,
    },
    supabase: {
      url: config.supabase.url,
      hasAnonKey: !!config.supabase.anonKey,
    },
  };
}

// Load and export configuration
export const env = loadEnv();

// Export validation function for testing
export { validateEnv };
