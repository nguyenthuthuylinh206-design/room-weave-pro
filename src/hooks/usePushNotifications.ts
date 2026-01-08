import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';

// VAPID public key - supports env variable for easy rotation
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BCHjtRPTJBxNXVoRvSR5Nn51WS1Naju_zvSUB2Tm2CWRMoj8tC7_g61mvYQyj_AnndZczKFYTnfigjN6y6PSDIY';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
}

export function usePushNotifications() {
  const { user: authUser } = useAuth();
  const { user, tenantId } = useUser();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
    subscription: null,
  });

  // Avoid writing the same subscription to DB repeatedly in a single session/tab
  const savedDbEndpointsRef = useRef<Set<string>>(new Set());

  const saveSubscriptionToDb = useCallback(
    async (subscription: PushSubscription, options?: { throwOnError?: boolean }) => {
      if (!authUser?.id || !tenantId) return;

      const cacheKey = `${authUser.id}:${subscription.endpoint}`;
      if (!options?.throwOnError && savedDbEndpointsRef.current.has(cacheKey)) return;

      try {
        const p256dh = subscription.getKey('p256dh');
        const auth = subscription.getKey('auth');
        if (!p256dh || !auth) {
          throw new Error('Missing subscription keys');
        }

        const p256dhKey = arrayBufferToBase64(p256dh);
        const authKey = arrayBufferToBase64(auth);

        const deviceName = getDeviceName();
        const userAgent = navigator.userAgent;

        const { error } = await supabase.from('push_subscriptions').upsert(
          {
            user_id: authUser.id,
            tenant_id: tenantId,
            endpoint: subscription.endpoint,
            p256dh_key: p256dhKey,
            auth_key: authKey,
            device_name: deviceName,
            user_agent: userAgent,
            is_active: true,
            failed_count: 0,
          },
          {
            onConflict: 'user_id,endpoint',
          }
        );

        if (error) throw error;

        savedDbEndpointsRef.current.add(cacheKey);
      } catch (err) {
        console.warn('[Push] Failed to persist subscription to DB:', err);
        if (options?.throwOnError) throw err;
      }
    },
    [authUser?.id, tenantId]
  );

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    // Check basic APIs exist
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    
    // In preview/iframe environments, these might be restricted
    // but the actual deployed app will work
    const isSupported = hasServiceWorker && hasPushManager && hasNotification;
    
    // Log for debugging
    console.log('[Push] Support check:', { hasServiceWorker, hasPushManager, hasNotification, isSupported });
    
    return isSupported;
  }, []);

  // Get current subscription status
  const checkSubscription = useCallback(async () => {
    if (!checkSupport()) {
      setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const permission = Notification.permission;

      // Permission/subscription are per-origin (browser), not per-account.
      // If a user logs in on a device that already has a subscription, we must
      // persist it for that user too, otherwise the backend will find 0 subscriptions.
      if (subscription && permission === 'granted') {
        void saveSubscriptionToDb(subscription);
      }

      setState({
        isSupported: true,
        isSubscribed: !!subscription,
        isLoading: false,
        permission,
        subscription,
      });
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkSupport, saveSubscriptionToDb]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!authUser?.id || !tenantId) {
      toast.error('Vui lòng đăng nhập để bật thông báo');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast.error('Bạn cần cho phép thông báo để nhận cập nhật');
        setState(prev => ({ ...prev, isLoading: false, permission }));
        return false;
      }

      // Use the main PWA service worker (registered by vite-plugin-pwa)
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push] Service Worker ready:', registration);
      console.log('[Push] SW active:', registration.active?.scriptURL);

      // Force update service worker if there's a waiting one
      if (registration.waiting) {
        console.log('[Push] Found waiting SW, activating it...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Force check for updates
      try {
        await registration.update();
        console.log('[Push] SW update check completed');
      } catch (updateErr) {
        console.warn('[Push] SW update check failed:', updateErr);
      }

      // Subscribe to push using the main service worker
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });


      // Persist to database for the current user
      await saveSubscriptionToDb(subscription, { throwOnError: true });


      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        permission: 'granted',
        subscription,
      }));

      toast.success('Đã bật thông báo đẩy');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Không thể bật thông báo. Vui lòng thử lại.');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [authUser?.id, tenantId, saveSubscriptionToDb]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('endpoint', subscription.endpoint);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        subscription: null,
      }));

      toast.success('Đã tắt thông báo đẩy');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Không thể tắt thông báo. Vui lòng thử lại.');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // Get device name from user agent
  function getDeviceName(): string {
    const ua = navigator.userAgent;
    
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) {
      const match = ua.match(/Android.*?([^;]+)\)/);
      return match ? match[1].trim() : 'Android';
    }
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Linux/.test(ua)) return 'Linux';
    
    return 'Unknown Device';
  }

  // Initialize on mount
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Re-check when user changes
  useEffect(() => {
    if (authUser?.id) {
      checkSubscription();
    }
  }, [authUser?.id, checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
