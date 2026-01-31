

## Kế hoạch: Sửa lỗi "Could not choose the best candidate function" cho confirm_receive_order

### NGUYÊN NHÂN

Database hiện có **2 function trùng tên** `confirm_receive_order`:
- Phiên bản cũ: `(p_order_id uuid, p_actor_id uuid)`  
- Phiên bản mới: `(p_order_id uuid, p_actor_id uuid, p_adjustments jsonb)`

Khi frontend gọi với 2 tham số, PostgreSQL không biết chọn function nào → lỗi "ambiguous function call".

### GIẢI PHÁP

**Phần 1: Sửa Database** - Xóa function cũ, chỉ giữ function mới có 3 tham số

**Phần 2: Sửa Frontend** - Truyền đủ tham số `p_adjustments: null` và dịch lỗi sang tiếng Việt

---

### THAY ĐỔI CHI TIẾT

#### 1. Database Migration

```sql
-- Xóa function cũ (2 tham số)
DROP FUNCTION IF EXISTS public.confirm_receive_order(uuid, uuid);

-- Giữ lại function mới (3 tham số) đã có sẵn
```

#### 2. File: `src/hooks/useRouteBatch.ts`

**Dòng 555-560**: Thêm tham số `p_adjustments: null` để chỉ định rõ function cần gọi

```typescript
// Trước
const { data, error } = await supabase.rpc('confirm_receive_order', {
  p_order_id: orderId,
  p_actor_id: user.id,
})

// Sau
const { data, error } = await supabase.rpc('confirm_receive_order', {
  p_order_id: orderId,
  p_actor_id: user.id,
  p_adjustments: null,  // Thêm để tránh ambiguous function call
})
```

**Dòng 564-578**: Dịch thông báo lỗi sang tiếng Việt

```typescript
// Sau khi nhận response, map error code sang tiếng Việt
const ERROR_MESSAGES: Record<string, string> = {
  ORDER_NOT_FOUND: 'Không tìm thấy phiếu giao hàng',
  INVALID_STATUS: 'Phiếu chưa được giao từ kho hoặc đã được xác nhận rồi',
  INSUFFICIENT_STOCK: 'Không đủ hàng trong kho để giao',
  ADJUSTMENT_EXCEEDS_STOCK: 'Số lượng điều chỉnh vượt quá tồn kho',
}

if (!response.success) {
  const errorCode = response.error || ''
  const message = ERROR_MESSAGES[errorCode] || response.message || 'Có lỗi xảy ra, vui lòng thử lại'
  throw new Error(message)
}
```

---

### TÓM TẮT

| Thay đổi | File | Mục đích |
|----------|------|----------|
| Migration | SQL | Xóa function cũ trùng lặp |
| Thêm `p_adjustments: null` | useRouteBatch.ts | Tránh lỗi ambiguous call |
| Error mapping | useRouteBatch.ts | Hiển thị lỗi tiếng Việt thay vì mã code |

