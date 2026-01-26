

## Kế hoạch: Sửa lỗi Access Denied khi Staff click thông báo giao việc

### I. NGUYÊN NHÂN GỐC

| Vấn đề | Chi tiết |
|--------|----------|
| **Route hiện tại** | `/staff?task=${taskId}` |
| **Protection** | `<PermissionRoute module="users">` |
| **NV Linh** | `user_level_code: staff` - Không có quyền `users` |
| **Kết quả** | Access Denied ❌ |

Trang `/staff` là **Staff Management** (quản lý nhân sự) dành cho Manager/Owner, nhưng notification lại gửi Staff đến route này.

---

### II. GIẢI PHÁP ĐỀ XUẤT

**Tạo route mới `/my-tasks`** dành riêng cho Staff xem công việc của mình, không yêu cầu quyền đặc biệt.

---

### III. CÁC BƯỚC THỰC HIỆN

#### Bước 1: Tạo page `MyTasksPage.tsx`
- Trang này hiển thị `StaffTasksTab` (tab công việc của tôi đã có sẵn)
- Chỉ cần wrapper đơn giản, không cần tabs phức tạp
- Tự động mở task detail nếu có `?task=xxx` query param

#### Bước 2: Thêm route `/my-tasks` vào App.tsx
```tsx
{
  path: "my-tasks",
  element: <MyTasksPage />  // Không cần PermissionRoute, mọi user đều có thể xem task của mình
}
```

#### Bước 3: Cập nhật `actionUrl` trong notification
```typescript
// Trong useNotificationTriggers.ts
const actionUrl = `/my-tasks?task=${taskId}`; // Thay vì /staff?task=...
```

#### Bước 4: Thêm link trong navigation (tùy chọn)
- Mobile: Thêm vào MorePage
- Desktop: Thêm vào sidebar

---

### IV. FILES CẦN TẠO/SỬA

| File | Thay đổi |
|------|----------|
| `src/pages/MyTasksPage.tsx` | **TẠO MỚI** - Page xem công việc cá nhân |
| `src/App.tsx` | Thêm route `/my-tasks` |
| `src/hooks/useNotificationTriggers.ts` | Đổi `actionUrl` từ `/staff?task=` sang `/my-tasks?task=` |

---

### V. LOGIC CỦA PAGE MỚI

```tsx
// MyTasksPage.tsx
export function MyTasksPage() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('task');
  
  return (
    <div className="container mx-auto p-4">
      <h1>Công việc của tôi</h1>
      {/* Hiển thị StaffTasksTab đã có sẵn */}
      <StaffTasksTab initialTaskId={taskId} />
    </div>
  );
}
```

---

### VI. LỢI ÍCH

- **Staff** có thể truy cập xem task được giao mà không cần quyền `users`
- **Manager/Owner** vẫn dùng `/staff` để quản lý nhân sự
- **Notification** hoạt động đúng cho tất cả user roles
- Phân tách rõ ràng: quản lý nhân sự vs xem công việc cá nhân

---

### VII. TEST SAU SỬA

1. Manager giao việc cho NV Linh
2. NV Linh nhận notification
3. Click vào notification → Mở `/my-tasks?task=xxx`
4. Hiển thị chi tiết task được giao ✅

