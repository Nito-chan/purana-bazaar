import { Capacitor } from '@capacitor/core';
import { canGoBackInApp, navigate } from '../router.js';
import { closeSheet, isSheetOpen } from '../ui/sheet.js';

/**
 * Handles the Android hardware back button inside the app.
 *
 * Without a listener Capacitor closes the activity on every press, which makes
 * back from a listing or a sheet quit the whole app. We mirror the platform
 * convention instead: close a sheet, walk back through in-app history, fall
 * back to home for deep links, and only minimise at the home screen.
 */
export async function initNativeBackButton() {
  if (!Capacitor.isNativePlatform()) return;

  const { App } = await import('@capacitor/app');

  await App.addListener('backButton', () => {
    if (isSheetOpen()) {
      closeSheet();
      return;
    }

    if (canGoBackInApp()) {
      window.history.back();
      return;
    }

    if (window.location.pathname !== '/') {
      navigate('/', { replace: true });
      return;
    }

    App.minimizeApp().catch(() => {
      // Older Android versions may not support minimise; staying put is safe.
    });
  });
}
