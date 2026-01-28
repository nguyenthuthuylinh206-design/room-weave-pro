
## Kế hoạch: Tự động cập nhật PWA mà không cần xóa đi cài lại

### Vấn đề hiện tại

Khi có phiên bản mới của ứng dụng:
1. Service Worker mới được tải về nhưng **đợi ở trạng thái "waiting"**
2. Người dùng phải đóng hoàn toàn tất cả tab/PWA và mở lại để kích hoạt SW mới
3. Trên iOS PWA, điều này đặc biệt khó khăn vì PWA chạy liên tục

### Giải pháp

Tạo hệ thống cập nhật tự động với 3 thành phần:

#### 1. Hook `usePWAUpdate` - Quản lý Service Worker update

Sử dụng `virtual:pwa-register/react` từ vite-plugin-pwa để:
- Kiểm tra update định kỳ (mỗi 1 giờ)
- Phát hiện khi có phiên bản mới (`needRefresh`)
- Cung cấp hàm `updateServiceWorker()` để áp dụng update

```typescript
// src/hooks/usePWAUpdate.ts
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 giờ

export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // Kiểm tra update định kỳ
      if (registration) {
        setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL);
      }
    },
    onNeedRefresh() {
      console.log('[PWA] New version available');
    },
  });

  const update = async () => {
    await updateServiceWorker(true);
  };

  const dismiss = () => setNeedRefresh(false);

  return { needRefresh, offlineReady, update, dismiss };
}
```

---

#### 2. Component `PWAUpdatePrompt` - Thông báo cập nhật

Hiển thị toast/banner khi có phiên bản mới, cho phép người dùng:
- **Cập nhật ngay** → Reload app với phiên bản mới
- **Để sau** → Ẩn thông báo (sẽ hiện lại khi mở app lần sau)

```typescript
// src/components/pwa/PWAUpdatePrompt.tsx
export function PWAUpdatePrompt() {
  const { needRefresh, update, dismiss } = usePWAUpdate();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!needRefresh) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    await update();
    // App sẽ reload tự động
  };

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 ...">
      <div className="flex items-center gap-3">
        <RefreshCw className="..." />
        <div>
          <h3>Có phiên bản mới</h3>
          <p>Nhấn "Cập nhật" để sử dụng các tính năng mới nhất</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button onClick={handleUpdate} disabled={isUpdating}>
          {isUpdating ? 'Đang cập nhật...' : 'Cập nhật ngay'}
        </Button>
        <Button variant="ghost" onClick={dismiss}>
          Để sau
        </Button>
      </div>
    </Card>
  );
}
```

---

#### 3. Tích hợp vào App

Thêm component vào layout chính:

```typescript
// src/App.tsx hoặc MainLayout.tsx
import { PWAUpdatePrompt } from '@/components/pwa/PWAUpdatePrompt';

// Trong JSX:
<PWAUpdatePrompt />
```

---

#### 4. Thêm TypeScript types cho virtual module

```typescript
// src/vite-env.d.ts
declare module 'virtual:pwa-register/react' {
  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, (value: boolean) => void];
    offlineReady: [boolean, (value: boolean) => void];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
```

---

### Flow hoạt động

```text
Người dùng đang dùng app (v1):
==============================
1. vite-plugin-pwa kiểm tra update mỗi 1 giờ
   ↓
2. Phát hiện có phiên bản mới (v2)
   ↓
3. Tải SW mới về background (trạng thái "waiting")
   ↓
4. Hook `usePWAUpdate` nhận callback `onNeedRefresh`
   ↓
5. State `needRefresh = true`
   ↓
6. Component `PWAUpdatePrompt` hiển thị
   ↓
7. Người dùng bấm "Cập nhật ngay"
   ↓
8. `updateServiceWorker(true)` gọi `skipWaiting()` + reload
   ↓
9. App load lại với phiên bản mới (v2) ✓
```

---

### Files thay đổi

| File | Hành động |
|------|-----------|
| `src/hooks/usePWAUpdate.ts` | **Tạo mới** - Hook quản lý PWA update |
| `src/components/pwa/PWAUpdatePrompt.tsx` | **Tạo mới** - UI thông báo update |
| `src/components/pwa/index.ts` | **Sửa** - Export component mới |
| `src/components/layout/MainLayout.tsx` | **Sửa** - Thêm PWAUpdatePrompt |
| `src/vite-env.d.ts` | **Sửa** - Thêm TypeScript types |

---

### Bonus: Nút "Kiểm tra cập nhật" trong Settings

Thêm vào trang Settings để người dùng có thể chủ động kiểm tra:

```typescript
// Trong NotificationSettingsPage hoặc MobileSettingsPage
const { needRefresh, update } = usePWAUpdate();

<Button onClick={() => registration?.update()}>
  Kiểm tra cập nhật
</Button>
```

---

### Lưu ý quan trọng

1. **iOS Safari**: Có thể cần 2 bước - tắt/mở lại PWA lần đầu để kích hoạt SW mới, sau đó các lần sau sẽ tự động
2. **Precache**: Với `injectManifest`, tất cả assets đã được cache. Khi SW mới activate, cache cũ sẽ được xóa tự động (`cleanupOutdatedCaches()`)
3. **Không cần xóa PWA**: Người dùng chỉ cần bấm "Cập nhật" hoặc đóng/mở lại app
