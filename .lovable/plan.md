

## Fix: Toggle bật phòng lại bị tắt

### Nguyên nhân gốc

`UserPermissionPanel.tsx` dòng 36-51 có `useEffect` lắng nghe `permissionsData`:

```typescript
useEffect(() => {
  if (permissionsData) {
    // Reset ALL local state from server data
    setLocalPermissions(initial)
    setLocalActions(initialActions)
  }
}, [permissionsData])  // ← Chạy lại mỗi khi React Query refetch
```

Khi user bật toggle → local state cập nhật → nhưng React Query tự refetch khi focus window hoặc staleTime hết → `permissionsData` thay đổi reference → `useEffect` chạy lại → **ghi đè local state bằng dữ liệu cũ từ server** → toggle bị tắt lại.

### Giải pháp

| # | File | Thay đổi |
|---|------|----------|
| 1 | `UserPermissionPanel.tsx` | Thêm `isDirty` ref để chặn `useEffect` ghi đè khi user đang có thay đổi chưa lưu |
| 2 | `useUserPermissionConfiguration.ts` | Set `staleTime: Infinity` và `refetchOnWindowFocus: false` cho query config để tránh refetch ngoài ý muốn |

### Chi tiết

**File 1 - UserPermissionPanel.tsx:**
```typescript
const isDirtyRef = useRef(false)

useEffect(() => {
  if (permissionsData && !isDirtyRef.current) {
    // Chỉ sync khi KHÔNG có thay đổi chưa lưu
    setLocalPermissions(initial)
    setLocalActions(initialActions)
  }
}, [permissionsData])

// Trong handleToggle & handleActionToggle:
isDirtyRef.current = true

// Trong handleSave onSuccess:
isDirtyRef.current = false
```

**File 2 - useUserPermissionConfiguration.ts:**
Thêm `staleTime: Infinity` và `refetchOnWindowFocus: false` vào query options để chỉ refetch khi explicitly invalidate sau save.

