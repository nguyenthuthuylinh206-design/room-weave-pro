 import { useEffect, useRef } from 'react';
 import { useRegisterSW } from 'virtual:pwa-register/react';
 import { toast } from 'sonner';

 const UPDATE_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function usePWAUpdate() {
   const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
 
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('[PWA] Service Worker registered');
       registrationRef.current = registration || null;
 
      if (registration) {
        setInterval(() => {
           console.log('[PWA] Periodic update check...');
          registration.update();
        }, UPDATE_CHECK_INTERVAL);
      }
    },
    onRegisterError(error) {
       console.error('[PWA] SW registration error:', error);
    },
    onNeedRefresh() {
       console.log('[PWA] New version available');
    },
    onOfflineReady() {
       console.log('[PWA] App ready offline');
    },
  });

   // Auto-reload when new SW takes control
   useEffect(() => {
     const handleControllerChange = () => {
       console.log('[PWA] New SW activated, reloading...');
       toast.info('Đang cập nhật phiên bản mới...', { duration: 2000 });
       setTimeout(() => {
         window.location.reload();
       }, 2000);
     };
 
     navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
     return () => {
       navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
     };
   }, []);
 
   // Check for updates when user returns to tab
   useEffect(() => {
     const handleVisibilityChange = () => {
       if (document.visibilityState === 'visible' && registrationRef.current) {
         console.log('[PWA] Tab visible, checking updates...');
         registrationRef.current.update();
       }
     };
 
     document.addEventListener('visibilitychange', handleVisibilityChange);
     return () => {
       document.removeEventListener('visibilitychange', handleVisibilityChange);
     };
   }, []);
 
  const update = async () => {
     console.log('[PWA] Manual update...');
    await updateServiceWorker(true);
  };

  const dismiss = () => {
    setNeedRefresh(false);
  };

  const checkForUpdate = async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
     if (registration) await registration.update();
  };

   return { needRefresh, offlineReady, update, dismiss, checkForUpdate };
}
