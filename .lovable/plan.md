

## Kế hoạch: Thêm Quy trình Điều chỉnh Số lượng Giao khi Kho Hết Đồ

### I. PHÂN TÍCH VẤN ĐỀ

**Tình huống hiện tại:**
- Phiếu DIS-20260131-015918-4247 yêu cầu: **Khăn tắm lớn x 4**
- Trong kho chỉ còn: **3** chiếc
- Khi nhân viên ấn "Xác nhận đã nhận đủ hàng" → **Lỗi** vì không đủ tồn kho

**Vấn đề:**
1. Hệ thống chặn cứng, không cho phép tiếp tục
2. Không có cách để điều chỉnh số lượng giao thực tế
3. Nhân viên bị stuck, không biết phải làm gì

### II. CÁC GIẢI PHÁP ĐỀ XUẤT

| Giải pháp | Mô tả | Ưu điểm | Nhược điểm |
|-----------|-------|---------|------------|
| **A. Điều chỉnh trước khi giao** | Quay lại chỉnh sửa phiếu | Đơn giản, có sẵn EditDistributionDialog | Phải quay về status pending |
| **B. Điều chỉnh tại bước nhận hàng** | Dialog cho phép nhập số lượng thực nhận | UX tốt, nhanh | Cần code mới |
| **C. Giao một phần (Partial Receive)** | Nhận tất cả đồ có, thiếu gì ghi nhận | Linh hoạt | Phức tạp hơn |

**Đề xuất: Kết hợp A + B**

### III. THIẾT KẾ GIẢI PHÁP

#### 3.1. Flow mới khi thiếu hàng

```text
NV ấn "Xác nhận nhận hàng"
        │
        ▼
┌───────────────────────────────────┐
│ RPC kiểm tra tồn kho              │
│ → Phát hiện thiếu một số mặt hàng │
└───────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ HIỂN THỊ DIALOG "ĐIỀU CHỈNH SỐ LƯỢNG GIAO"                    │
│ ─────────────────────────────────────────────────────         │
│                                                               │
│ ⚠ Một số mặt hàng không đủ tồn kho:                          │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Mặt hàng          │ Yêu cầu │ Trong kho │ Giao thực tế │  │
│ ├─────────────────────────────────────────────────────────┤  │
│ │ Khăn tắm lớn      │    4    │     3     │   [ 3 ]  ▼  │  │
│ │ Dầu gội đầu       │    2    │     2     │   [ 2 ]  ✓  │  │
│ │ ...               │   ...   │    ...    │   [...]     │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ Ghi chú: ____________________                                 │
│                                                               │
│ [ Hủy ]  [ Quay lại chỉnh sửa phiếu ]  [ Xác nhận giao thiếu ]│
└───────────────────────────────────────────────────────────────┘
```

#### 3.2. Thay đổi Database

**Thêm cột mới vào `distribution_order_items`:**

```sql
ALTER TABLE distribution_order_items
ADD COLUMN quantity_actual integer DEFAULT NULL;

COMMENT ON COLUMN distribution_order_items.quantity_actual IS 
'Số lượng giao thực tế (có thể khác quantity khi thiếu hàng)';
```

| Cột | Mô tả |
|-----|-------|
| `quantity` | Số lượng yêu cầu ban đầu |
| `quantity_actual` | Số lượng giao thực tế (NULL = giao đủ) |
| `quantity_confirmed` | Số lượng xác nhận tại phòng |

#### 3.3. Thay đổi RPC

**Sửa `confirm_receive_order`:**

```sql
CREATE OR REPLACE FUNCTION confirm_receive_order(
  p_order_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_adjustments jsonb DEFAULT NULL  -- THÊM THAM SỐ MỚI
)
```

**Logic mới:**
1. Nếu `p_adjustments = NULL` → Kiểm tra tồn kho như cũ
2. Nếu có `p_adjustments` → Sử dụng số lượng điều chỉnh, bỏ qua kiểm tra

**Format `p_adjustments`:**
```json
[
  {
    "item_id": "1415bc4c-...",
    "quantity_actual": 3
  }
]
```

#### 3.4. Thêm Dialog mới

**File mới: `AdjustQuantityDialog.tsx`**

```tsx
interface AdjustQuantityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  insufficientItems: InsufficientItem[]
  orderId: string
  onConfirm: (adjustments: ItemAdjustment[]) => void
  onEditOrder: () => void  // Quay lại chỉnh sửa phiếu
}
```

**Tính năng:**
- Hiển thị bảng các item thiếu hàng
- Input cho phép điều chỉnh số lượng (max = available)
- Nút "Quay lại chỉnh sửa phiếu" → Mở EditDistributionDialog
- Nút "Xác nhận giao thiếu" → Gọi RPC với adjustments

#### 3.5. Cập nhật Hook

**Sửa `useConfirmReceiveOrder`:**

```typescript
export function useConfirmReceiveOrder() {
  return useMutation({
    mutationFn: async ({ 
      orderId, 
      adjustments  // THÊM
    }: { 
      orderId: string
      adjustments?: { item_id: string; quantity_actual: number }[]
    }) => {
      // ...
    },
    onError: (error, variables, context) => {
      // Thay vì chỉ toast.error, trả về data để component xử lý
    }
  })
}
```

### IV. FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| **Database** | Migration: Thêm cột `quantity_actual` |
| **RPC** | Sửa `confirm_receive_order` để nhận `p_adjustments` |
| **useRouteBatch.ts** | Sửa hook để hỗ trợ adjustments |
| **AdjustQuantityDialog.tsx** | Tạo mới: Dialog điều chỉnh số lượng |
| **RouteDetailView.tsx** | Thêm state và logic để mở dialog |
| **DeliveryStepWizard.tsx** | Truyền thêm props cho error handling |

### V. QUY TRÌNH SAU KHI SỬA

```text
TRƯỜNG HỢP 1: Kho ĐỦ đồ
─────────────────────────
NV ấn "Xác nhận nhận hàng"
    │
    ▼
RPC check → OK
    │
    ▼
Trừ tồn kho → Chuyển sang in_progress
    │
    ▼
NV bắt đầu giao đến từng phòng


TRƯỜNG HỢP 2: Kho THIẾU đồ
──────────────────────────
NV ấn "Xác nhận nhận hàng"
    │
    ▼
RPC check → INSUFFICIENT_STOCK + danh sách thiếu
    │
    ▼
Mở AdjustQuantityDialog
    │
    ├── [Quay lại chỉnh sửa] → Mở EditDistributionDialog
    │                         → Chỉnh quantity → Lưu
    │                         → Quay lại confirm
    │
    └── [Xác nhận giao thiếu] → Gọi RPC với adjustments
                              → quantity_actual được ghi nhận
                              → Trừ tồn kho theo quantity_actual
                              → Chuyển sang in_progress
                              │
                              ▼
                          NV giao với số lượng đã điều chỉnh
                          (Phòng sẽ nhận ít hơn yêu cầu ban đầu)
```

### VI. UI/UX CHI TIẾT

**AdjustQuantityDialog:**

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Điều chỉnh số lượng giao                    │
│ ────────────────────────────────────────────                    │
│                                                                 │
│  ⚠ Một số mặt hàng không đủ trong kho                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Mặt hàng        │ Yêu cầu │ Trong kho │ Sẽ giao          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ ⚠ Khăn tắm lớn │    4    │     3     │ [−] 3  [+]       │  │
│  │   Dầu gội đầu   │    2    │     2     │ [−] 2  [+]  ✓   │  │
│  │   Xà phòng      │    2    │   994     │ [−] 2  [+]  ✓   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Lý do điều chỉnh:                                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Thiếu khăn tắm lớn, đợi nhập hàng ngày mai           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │ Quay lại chỉnh sửa  │  │   Xác nhận giao thiếu           │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Luật validate:**
- Không được giao nhiều hơn số lượng trong kho
- Có thể giao 0 (bỏ qua item đó)
- Bắt buộc nhập lý do điều chỉnh

### VII. INVENTORY TRACKING

**Sau khi giao thiếu:**

| Cột | Giá trị | Ý nghĩa |
|-----|---------|---------|
| `quantity` | 4 | Số lượng yêu cầu ban đầu |
| `quantity_actual` | 3 | Số lượng giao thực tế |
| `quantity_confirmed` | 3 | Số lượng xác nhận tại phòng |

**Báo cáo có thể truy xuất:**
- Tổng số lượng yêu cầu vs giao thực tế
- Tỷ lệ hoàn thành đơn hàng
- Các mặt hàng thường xuyên thiếu

### VIII. TÓM TẮT TRIỂN KHAI

1. **Migration**: Thêm cột `quantity_actual`
2. **RPC**: Sửa để nhận `p_adjustments`
3. **Dialog**: Tạo `AdjustQuantityDialog.tsx`
4. **Hook**: Cập nhật để xử lý insufficient stock
5. **Integration**: Kết nối dialog vào flow hiện tại

