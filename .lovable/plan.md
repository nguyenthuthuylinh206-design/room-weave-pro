
## Triển khai: PWA Auto-Update Realtime

### THAY ĐỔI SẼ THỰC HIỆN

---

### 1. Cập nhật `src/hooks/usePWAUpdate.ts`

**Thay đổi chính:**
- Giảm interval từ 1 giờ xuống **2 phút** (120 giây)
- Thêm **visibility check** - check update ngay khi user quay lại tab
- Thêm **controllerchange listener** - tự động reload khi SW mới activate
- Thêm **toast thông báo** trước khi reload (2 giây)

```typescript
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
        // Check for updates every 2 minutes
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
```

---

### 2. Cập nhật `src/sw.ts`

Thêm xử lý `FORCE_RELOAD` message để admin có thể force reload tất cả clients khi cần:

```typescript
// Handle message from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received, activating...');
    self.skipWaiting();
  }
  
  // Force reload all clients (for critical updates)
  if (event.data?.type === 'FORCE_RELOAD') {
    console.log('[SW] FORCE_RELOAD received, reloading all clients...');
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        (client as WindowClient).navigate(client.url);
      });
    });
  }
});
```

---

### 3. Cập nhật `PWAUpdatePrompt.tsx` (Optional Enhancement)

Thêm auto-update sau 10 giây nếu user không dismiss:

```typescript
// Auto-update after 10 seconds if not dismissed
useEffect(() => {
  if (needRefresh && !isUpdating) {
    const timer = setTimeout(() => {
      handleUpdate();
    }, 10000); // 10 seconds
    
    return () => clearTimeout(timer);
  }
}, [needRefresh, isUpdating]);
```

---

### FLOW SAU KHI TRIỂN KHAI

```text
┌─────────────────────────────────────────────────────────────┐
│ BẠN PUBLISH PHIÊN BẢN MỚI                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ User đang dùng app (SW cũ)                                  │
│                                                             │
│ Trigger check update:                                       │
│ • Mỗi 2 phút (interval)                                     │
│ • HOẶC khi user quay lại tab (visibility)                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ SW phát hiện version mới → Download → Install               │
│ skipWaiting() → SW mới activate                             │
│ clients.claim() → SW mới control page                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Event 'controllerchange' fire                               │
│ usePWAUpdate hook catch event                               │
│ Toast: "Đang cập nhật phiên bản mới..."                     │
│ setTimeout 2s → window.location.reload()                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ User thấy phiên bản mới - KHÔNG CẦN LÀM GÌ!               │
└─────────────────────────────────────────────────────────────┘
```

---

### FILES SẼ SỬA

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/hooks/usePWAUpdate.ts` | Interval 2 phút, visibility check, controllerchange listener, toast trước reload |
| 2 | `src/sw.ts` | Thêm FORCE_RELOAD handler |
| 3 | `src/components/pwa/PWAUpdatePrompt.tsx` | (Optional) Auto-update sau 10s |

---

### KẾT QUẢ

| Trước | Sau |
|-------|-----|
| Check update 1 giờ/lần | Check 2 phút/lần + khi quay lại tab |
| User phải bấm "Cập nhật" | Tự động reload sau 2s thông báo |
| Có thể dùng bản cũ cả ngày | Max 2 phút là có bản mới |
| Xóa cache thủ công | Không cần, tự động |
