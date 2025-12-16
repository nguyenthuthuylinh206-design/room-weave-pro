import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';

// VAPID public key - must match the one in secrets
const VAPID_PUBLIC_KEY = 'BCHjtRPTJBxNXVoRvSR5Nn51WS1Naju_zvSUB2Tm2CWRMoj8tC7_g61mvYQyj_AnndZczKFYTnfigjN6y6PSDIY';

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

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    const isSupported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    
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
  }, [checkSupport]);

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

      // Register service worker if needed
      let registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Extract keys
      const p256dhKey = arrayBufferToBase64(subscription.getKey('p256dh')!);
      const authKey = arrayBufferToBase64(subscription.getKey('auth')!);

      // Get device info
      const deviceName = getDeviceName();
      const userAgent = navigator.userAgent;

      // Save to database
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

      if (error) {
        console.error('Error saving subscription:', error);
        throw error;
      }

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
  }, [authUser?.id, tenantId]);

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
