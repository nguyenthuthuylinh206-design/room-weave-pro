import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('[PWA] Service Worker registered');
      // Check for updates periodically
      if (registration) {
        setInterval(() => {
          console.log('[PWA] Checking for updates...');
          registration.update();
        }, UPDATE_CHECK_INTERVAL);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
    onNeedRefresh() {
      console.log('[PWA] New version available, refresh needed');
    },
    onOfflineReady() {
      console.log('[PWA] App ready to work offline');
    },
  });

  const update = async () => {
    console.log('[PWA] Updating to new version...');
    await updateServiceWorker(true);
  };

  const dismiss = () => {
    console.log('[PWA] Update dismissed');
    setNeedRefresh(false);
  };

  const checkForUpdate = async () => {
    console.log('[PWA] Manual update check triggered');
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.update();
    }
  };

  return { 
    needRefresh, 
    offlineReady, 
    update, 
    dismiss,
    checkForUpdate,
  };
}
