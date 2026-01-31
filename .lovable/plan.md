

## Kế hoạch: Sửa lỗi nút "GIAO" không hoạt động

### PHÂN TÍCH VẤN ĐỀ

Dựa trên kiểm tra code và database, tôi phát hiện các vấn đề sau:

**1. Function `deliver_stop` bị trùng lặp trong database:**
- Phiên bản cũ: `(p_stop_id uuid, p_actor_id uuid)` - 2 tham số
- Phiên bản mới: `(p_room_order_id uuid, p_items_confirmed jsonb, p_actor_id uuid)` - 3 tham số

Điều này tương tự lỗi `confirm_receive_order` đã sửa trước đó và có thể gây ra lỗi "ambiguous function call" trong một số trường hợp.

**2. Quy trình giao hàng hiện tại:**
```text
pending → released → in_progress → completed → closed
           ↑             ↑
     (Kho giao)    (NV xác nhận)
```

Nút "GIAO" chỉ hoạt động khi phiếu ở trạng thái `in_progress`. Nếu chưa xác nhận nhận hàng, phiếu vẫn ở `released` và nút GIAO sẽ không hiển thị hoặc không hoạt động.

**3. Lỗi tiếng Việt chưa được map:**
Khi gọi `deliver_stop` thất bại, lỗi hiển thị bằng tiếng Anh kỹ thuật thay vì tiếng Việt thân thiện.

### GIẢI PHÁP

#### 1. Database Migration - Xóa function cũ

```sql
-- Xóa function deliver_stop cũ (2 tham số) để tránh conflict
DROP FUNCTION IF EXISTS public.deliver_stop(uuid, uuid);
```

#### 2. Frontend - Map lỗi sang tiếng Việt

**File: `src/hooks/useRouteBatch.ts`**

Thêm error mapping cho `useDeliverStop`:

```typescript
const DELIVER_STOP_ERROR_MESSAGES: Record<string, string> = {
  'Stop not found': 'Không tìm thấy phòng này trong phiếu',
  'Room order not found': 'Không tìm thấy thông tin phòng',
  'Order not in progress': 'Phiếu chưa ở trạng thái đang giao - vui lòng xác nhận nhận hàng trước',
  'You are not assigned to this order': 'Bạn không được phân công cho phiếu này',
  'You are not assigned to this route': 'Bạn không được phân công cho phiếu này',
  'Batch not received yet': 'Hàng chưa được xác nhận nhận - vui lòng xác nhận nhận hàng trước',
  'Batch not ready for delivery': 'Hàng chưa sẵn sàng để giao',
  'Stop already processed': 'Phòng này đã được xử lý rồi',
}
```

Cập nhật `onError` để dịch message:

```typescript
onError: (error: Error) => {
  const originalMessage = error.message || ''
  
  // Tìm message phù hợp
  let translatedMessage = 'Không thể giao hàng'
  for (const [key, value] of Object.entries(DELIVER_STOP_ERROR_MESSAGES)) {
    if (originalMessage.includes(key)) {
      translatedMessage = value
      break
    }
  }
  
  toast.error(translatedMessage)
}
```

### TÓM TẮT THAY ĐỔI

| Thay đổi | File | Mục đích |
|----------|------|----------|
| Xóa function cũ | SQL Migration | Tránh conflict với function 2 tham số |
| Thêm error mapping | useRouteBatch.ts | Hiển thị lỗi tiếng Việt dễ hiểu |

### LƯU Ý CHO NGƯỜI DÙNG

Để nút "GIAO" hoạt động, cần đảm bảo:
1. Phiếu đã được quản lý kho "Giao hàng cho nhân viên" (chuyển từ `pending` → `released`)
2. Nhân viên đã ấn "Xác nhận đã nhận đủ hàng" (chuyển từ `released` → `in_progress`)
3. Chỉ nhân viên được phân công mới thấy và ấn được nút GIAO

