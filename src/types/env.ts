/**
 * Environment variable types and configuration
 */

export type AppEnvironment = 'development' | 'staging' | 'production';

export type PlaidEnvironment = 'sandbox' | 'development' | 'production';

export interface EnvironmentConfig {
  // Supabase (Required)
  supabase: {
    url: string;
    anonKey: string;
  };

  // Plaid (Optional)
  plaid?: {
    clientId: string;
    secret: string;
    env: PlaidEnvironment;
  };

  // TMDB (Optional)
  tmdb?: {
    apiKey: string;
  };

  // App Config
  app: {
    env: AppEnvironment;
    debug: boolean;
  };
}

export interface EnvValidationError {
  variable: string;
  message: string;
}
