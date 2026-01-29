

## Phân Tích Vấn Đề: PWA - Ghi Nhớ Tài Khoản và Tự Động Đăng Nhập Không Hoạt Động

### I. NGUYÊN NHÂN GỐC RỄ

Có **3 vấn đề chính** ảnh hưởng đến việc ghi nhớ và tự động đăng nhập trên PWA:

---

#### 1. iOS Safari ITP (Intelligent Tracking Prevention) - **Quan trọng nhất**

**Vấn đề:**
- iOS Safari có cơ chế ITP xóa localStorage sau **7 ngày** nếu không tương tác
- Khi PWA được cài đặt từ Home Screen, ITP được vô hiệu hóa (điểm tốt)
- **NHƯNG**: App chưa yêu cầu `navigator.storage.persist()` để đảm bảo dữ liệu không bị xóa

**Hiện trạng trong code:**
```typescript
// src/integrations/supabase/client.ts
auth: {
  storage: localStorage,  // ← Dùng localStorage, có thể bị xóa
  persistSession: true,
  autoRefreshToken: true,
}
```

---

#### 2. Thiếu Request Persistent Storage

**Vấn đề:**
- App không gọi `navigator.storage.persist()` khi khởi động
- Trên iOS, cần request persist storage để ngăn dữ liệu bị xóa khi device restart hoặc storage pressure

**Cần thêm:**
```typescript
// Request persistent storage khi app khởi động
if (navigator.storage && navigator.storage.persist) {
  const isPersisted = await navigator.storage.persist()
  console.log('[Storage] Persistence granted:', isPersisted)
}
```

---

#### 3. Browser Credential Manager - Hidden Input Cần Điều Chỉnh

**Vấn đề trong `QuickReLogin.tsx`:**
```typescript
// Line 68-73 - Hidden input không được browser đọc đúng
<input 
  type="hidden"      // ← hidden không trigger credential manager
  name="username" 
  autoComplete="username" 
  value={email} 
/>
```

**Trên iOS Safari:**
- `type="hidden"` không được credential manager nhận diện
- Cần dùng input visible hoặc `readOnly` với styling ẩn

---

### II. GIẢI PHÁP ĐỀ XUẤT

#### A. Thêm Persistent Storage Request (Ưu tiên: Cao)

**File:** `src/main.tsx` hoặc `src/App.tsx`

**Thay đổi:**
```typescript
// Thêm hook requestPersistentStorage
useEffect(() => {
  const requestPersistentStorage = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted()
      if (!isPersisted) {
        const granted = await navigator.storage.persist()
        console.log('[PWA] Persistent storage:', granted ? 'granted' : 'denied')
      }
    }
  }
  
  // Chỉ request khi PWA (standalone mode)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  if (isStandalone) {
    requestPersistentStorage()
  }
}, [])
```

---

#### B. Fix Hidden Username Input (Ưu tiên: Cao)

**File:** `src/components/auth/QuickReLogin.tsx`

**Thay đổi từ:**
```typescript
<input 
  type="hidden" 
  name="username" 
  autoComplete="username" 
  value={email} 
/>
```

**Thành:**
```typescript
<input 
  type="email"
  name="username"
  id="quick-login-username"
  autoComplete="username"
  value={email}
  readOnly
  tabIndex={-1}
  aria-hidden="true"
  className="sr-only"  // Screen-reader only, visually hidden
/>
```

---

#### C. Thêm IndexedDB Fallback cho Session (Ưu tiên: Trung bình)

**Vấn đề:**
- localStorage có thể bị xóa trên iOS trong một số trường hợp
- IndexedDB có khả năng persist tốt hơn

**Giải pháp:**
Tạo custom storage adapter sử dụng IndexedDB với localStorage fallback:

```typescript
// src/lib/persistentStorage.ts
const STORAGE_DB_NAME = 'roomweave-auth'
const STORAGE_STORE_NAME = 'session'

export const createPersistentStorage = () => {
  // Kiểm tra IndexedDB availability
  const hasIndexedDB = typeof indexedDB !== 'undefined'
  
  if (!hasIndexedDB) {
    // Fallback to localStorage
    return localStorage
  }
  
  return {
    getItem: async (key: string) => {
      // Try IndexedDB first, fallback to localStorage
    },
    setItem: async (key: string, value: string) => {
      // Write to both IndexedDB and localStorage
    },
    removeItem: async (key: string) => {
      // Remove from both
    }
  }
}
```

**Lưu ý:** Supabase client file được auto-generate, nên cần tạo wrapper hoặc sử dụng approach khác.

---

#### D. Thêm Session Restore Logic (Ưu tiên: Trung bình)

**File:** `src/contexts/AuthContext.tsx`

**Thay đổi:**
Thêm logic phát hiện và khôi phục session từ storage khi app khởi động:

```typescript
// Trong useEffect khởi tạo
useEffect(() => {
  const initAuth = async () => {
    // 1. Check storage persistence
    await requestPersistentStorage()
    
    // 2. Try to restore session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (session) {
      // Session restored successfully
      console.log('[Auth] Session restored from storage')
    } else if (!error) {
      // No session, no error - normal case
      console.log('[Auth] No stored session')
    } else {
      // Error restoring - might need re-login
      console.warn('[Auth] Session restore error:', error)
    }
    
    setSession(session)
    setUser(session?.user ?? null)
    setLoading(false)
  }
  
  initAuth()
  
  // ... rest of listener setup
}, [])
```

---

### III. THỰC HIỆN THEO THỨ TỰ

| # | Task | File | Mức độ |
|---|------|------|--------|
| 1 | Fix hidden input trong QuickReLogin | `QuickReLogin.tsx` | **Cao** |
| 2 | Request persistent storage khi PWA | `AuthContext.tsx` hoặc `App.tsx` | **Cao** |
| 3 | Thêm logging chi tiết cho debug | `AuthContext.tsx` | Trung bình |
| 4 | IndexedDB storage adapter (nếu cần) | Tạo mới `persistentStorage.ts` | Thấp |

---

### IV. CHI TIẾT THAY ĐỔI

#### 1. QuickReLogin.tsx - Fix Credential Manager

```typescript
// Line 67-73: Thay hidden input
{/* Username input for browser credential manager - styled to be invisible but focusable */}
<input 
  type="email"
  name="username"
  id="quick-login-username"
  autoComplete="username"
  value={email}
  readOnly
  tabIndex={-1}
  aria-hidden="true"
  className="absolute -left-[9999px] w-px h-px opacity-0"
/>
```

#### 2. AuthContext.tsx - Persistent Storage + Enhanced Logging

```typescript
// Thêm function requestPersistentStorage
const requestPersistentStorage = async () => {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted()
      if (!isPersisted) {
        const granted = await navigator.storage.persist()
        console.log('[Auth] Persistent storage request:', granted ? 'granted' : 'denied')
      } else {
        console.log('[Auth] Storage already persistent')
      }
    }
  } catch (e) {
    console.warn('[Auth] Persistent storage not supported:', e)
  }
}

// Gọi trong useEffect đầu tiên
useEffect(() => {
  // Request persistent storage for PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isIOSStandalone = (window.navigator as any).standalone === true
  
  if (isStandalone || isIOSStandalone) {
    requestPersistentStorage()
  }
  
  // ... existing auth listener code
}, [])
```

---

### V. KIỂM TRA SAU TRIỂN KHAI

1. **Test trên iOS Safari:**
   - Cài PWA từ Home Screen
   - Đăng nhập với "Ghi nhớ"
   - Tắt app hoàn toàn (swipe up)
   - Mở lại → Kiểm tra tự động đăng nhập

2. **Test trên Android Chrome:**
   - Cài PWA
   - Đăng nhập → Đóng app → Mở lại

3. **Kiểm tra Console Logs:**
   - `[Auth] Persistent storage request: granted`
   - `[Auth] Session restored from storage`

---

### VI. LƯU Ý QUAN TRỌNG

1. **Không thể sửa `src/integrations/supabase/client.ts`** - File này auto-generate
2. Persistent storage request có thể bị từ chối nếu user không có nhiều interaction với site
3. iOS có thể xóa data khi device restart lâu hoặc low storage - đây là giới hạn của platform

