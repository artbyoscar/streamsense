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
 * Returns object with required errors and optional warnings
 */
function validateEnv(): { errors: EnvValidationError[]; warnings: string[] } {
  const errors: EnvValidationError[] = [];
  const warnings: string[] = [];

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

  // Optional: Plaid (warn if partially configured)
  const plaidClientId = getEnvVar('EXPO_PUBLIC_PLAID_CLIENT_ID');
  const plaidSecret = getEnvVar('EXPO_PUBLIC_PLAID_SECRET');
  const plaidEnv = getEnvVar('EXPO_PUBLIC_PLAID_ENV');

  if (!plaidClientId && !plaidSecret) {
    warnings.push('⚠️  Plaid credentials not configured - bank connection features will be disabled');
  } else if (plaidClientId && !plaidSecret) {
    warnings.push('⚠️  EXPO_PUBLIC_PLAID_SECRET is missing - Plaid features will be disabled');
  } else if (!plaidClientId && plaidSecret) {
    warnings.push('⚠️  EXPO_PUBLIC_PLAID_CLIENT_ID is missing - Plaid features will be disabled');
  } else if (plaidEnv && !['sandbox', 'development', 'production'].includes(plaidEnv)) {
    warnings.push(`⚠️  EXPO_PUBLIC_PLAID_ENV must be sandbox, development, or production (got: ${plaidEnv})`);
  }

  // Optional: TMDB
  const tmdbApiKey = getEnvVar('EXPO_PUBLIC_TMDB_API_KEY');
  if (!tmdbApiKey) {
    warnings.push('⚠️  TMDB API key not configured - content search features will use fallback data');
  }

  // Validate app environment
  const appEnv = getEnvVar('EXPO_PUBLIC_APP_ENV', 'development');
  if (appEnv && !['development', 'staging', 'production'].includes(appEnv)) {
    errors.push({
      variable: 'EXPO_PUBLIC_APP_ENV',
      message: 'App environment must be development, staging, or production',
    });
  }

  return { errors, warnings };
}

/**
 * Load and validate environment configuration
 * Throws error if required variables are missing
 * Logs warnings for optional missing variables
 */
function loadEnv(): EnvironmentConfig {
  const { errors, warnings } = validateEnv();

  // Only throw for REQUIRED configuration errors
  if (errors.length > 0) {
    const errorMessage = errors.map(err => `  - ${err.variable}: ${err.message}`).join('\n');

    throw new Error(
      `❌ Environment Configuration Error:\n\n${errorMessage}\n\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `See .env.example for reference.`
    );
  }

  // Log warnings for optional missing configuration (don't throw)
  if (warnings.length > 0) {
    console.warn('📝 Environment Configuration Warnings:');
    warnings.forEach(warning => console.warn(`   ${warning}`));
    console.warn(''); // Empty line for readability
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

  // Plaid configuration - credentials are kept server-side in Supabase Edge Functions
  // Client only needs to know the environment and whether Plaid is enabled
  const plaidEnv = getEnvVar('EXPO_PUBLIC_PLAID_ENV', 'sandbox') as PlaidEnvironment;
  const plaidEnabled = getEnvVar('EXPO_PUBLIC_PLAID_ENABLED', 'true');

  if (plaidEnabled === 'true') {
    config.plaid = {
      clientId: '', // Kept server-side for security
      secret: '',   // Kept server-side for security
      env: plaidEnv || 'sandbox',
    };
    console.log('✅ Plaid feature enabled (credentials server-side)');
  }

  // Add optional TMDB config if present
  const tmdbApiKey = getEnvVar('EXPO_PUBLIC_TMDB_API_KEY');
  if (tmdbApiKey) {
    config.tmdb = {
      apiKey: tmdbApiKey,
    };
    console.log('✅ TMDB configuration loaded');
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
