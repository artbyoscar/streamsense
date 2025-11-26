/**
 * CRITICAL FIX: Disable native screens to prevent Android crash
 * "java.lang.String cannot be cast to java.lang.Boolean"
 *
 * This MUST be imported BEFORE any @react-navigation imports anywhere in the app
 */
import { enableScreens } from 'react-native-screens';

// Disable native screens - use JavaScript fallback
enableScreens(false);
