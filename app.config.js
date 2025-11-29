export default {
  expo: {
    name: "streamsense-temp",
    slug: "streamsense-temp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      package: "com.artbyoscar.streamsense",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    plugins: [
      [
        "@burstware/expo-plaid-link",
        {
          android: {
            package: "com.artbyoscar.streamsense"
          }
        }
      ]
    ],
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
      EXPO_PUBLIC_DEBUG: process.env.EXPO_PUBLIC_DEBUG,
      tmdbApiKey: process.env.EXPO_PUBLIC_TMDB_API_KEY,
      tmdbAccessToken: process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN,
      revenueCatIosApiKey: process.env.REVENUECAT_IOS_API_KEY,
      revenueCatAndroidApiKey: process.env.REVENUECAT_ANDROID_API_KEY,
      sentryDsn: process.env.SENTRY_DSN,
      eas: {
        projectId: "fdd17ec3-8028-4ff0-a6e0-3df9bd1934a3"
      }
    },
    hooks: {
      postPublish: [
        {
          file: "sentry-expo/upload-sourcemaps",
          config: {
            organization: "your-org",
            project: "streamsense"
          }
        }
      ]
    }
  }
};
