import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

// Crash reporting (Sentry, owner's OK 2026-11-17). When the phone app crashes or hits an error, the technical
// details (the error, the screen, the phone model and app version) go to Servly's Sentry account so Claude can fix it.
// Never messages, card details or other personal information (sendDefaultPii is off).
// It stays OFF until EXPO_PUBLIC_SENTRY_DSN is set (the "DSN" from the owner's Sentry project; also stored in EAS),
// and it needs a new app build (it lives inside the app). Phones only: the website is left out.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const crashReportingOn = !!DSN && Platform.OS !== 'web';

if (crashReportingOn) {
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,   // no names, emails or IP addresses
    tracesSampleRate: 0,     // crashes and errors only, no performance tracking
    environment: __DEV__ ? 'development' : 'app',
  });
}

// Admin > "Send a test error": a harmless, clearly labelled error so the owner can check Sentry's email alert.
// Returns false when crash reporting is off (website, or no DSN in this build).
export async function sendTestError() {
  if (!crashReportingOn) return false;
  Sentry.captureException(new Error(`Servly test error (sent from Admin on purpose, ${new Date().toISOString()})`));
  await Sentry.flush();
  return true;
}

// Wraps the whole app so crashes on any screen are caught; does nothing while crash reporting is off.
export function withCrashReporting(App: () => React.JSX.Element) {
  return crashReportingOn ? Sentry.wrap(App) : App;
}
