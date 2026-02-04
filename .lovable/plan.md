
## Kế hoạch: Hoàn thiện Logic "Thêm vào lô giặt nháp"

### VẤN ĐỀ HIỆN TẠI

| Bước | Quy trình chuẩn (`create_laundry_batch_with_items`) | RPC hiện tại (`add_laundry_to_draft_batch`) |
|------|-----------------------------------------------------|---------------------------------------------|
| 1. Kiểm tra tồn kho | CO - Validate `quantity_in_stock >= quantity` | THIEU - Không kiểm tra |
| 2. Cập nhật inventory | CO - `stock -= quantity`, `laundry += quantity` | THIEU - Không cập nhật |
| 3. Tạo batch items | CO | CO |
| 4. Cập nhật batch total | CO | CO |
| 5. Cập nhật request status | N/A | CO |
| 6. Xác nhận người dùng | CO (3 bước) | THIEU - 1 click |
| 7. Chọn vendor | CO | THIEU - Batch tự tạo không có vendor |
| 8. Nhập ngày giao/nhận | CO | THIEU - Batch draft không có thông tin này |

### PHÂN TÍCH NGHIỆP VỤ

Quy trình Room Check → Laundry Request → Batch hiện tại:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. ROOM CHECK (checkout)                                                    │
│    ├── items_sent_to_laundry → Đã cập nhật inventory (stock - , laundry +) │
│    └── Tạo laundry_request (status: pending)                               │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. "THÊM VÀO LÔ GIẶT NHÁP" ← HIỆN TẠI                                       │
│    ├── Tìm/tạo draft batch (status: draft)                                 │
│    ├── Thêm items vào laundry_batch_items                                  │
│    ├── Cập nhật request status → added_to_batch                            │
│    └── ❌ KHÔNG cập nhật inventory (vì đã cập nhật ở step 1)               │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. GỬI LÔ GIẶT (status: delivered)                                          │
│    ├── Chọn vendor, ngày giao, người giao                                   │
│    └── Gửi đi đơn vị giặt                                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

**KẾT LUẬN**: Inventory đã được cập nhật ở bước Room Check → RPC `add_laundry_to_draft_batch` **ĐÚNG** khi không cập nhật lại inventory.

### VẤN ĐỀ THỰC SỰ

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | **Không có xác nhận trước khi thêm** - 1 click thêm ngay, dễ nhầm | HIGH |
| 2 | **Không hiển thị tổng hợp draft batch** - Không biết đã có bao nhiêu items | MEDIUM |
| 3 | **Không có option chọn batch khác** - Luôn thêm vào draft hôm nay | MEDIUM |
| 4 | **Không có option thêm nhiều request cùng lúc** - Phải thêm từng cái | LOW |
| 5 | **Draft batch tự tạo không có vendor** - Thiếu thông tin quan trọng | HIGH |
| 6 | **Không có flow "Gửi lô giặt"** - Draft → Delivered cần bổ sung thông tin | HIGH |

---

### GIẢI PHÁP

#### 1. Thêm Dialog xác nhận trước khi thêm vào batch

```text
┌─────────────────────────────────────────────────────────────────┐
│  XÁC NHẬN THÊM VÀO LÔ GIẶT                             [×]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Yêu cầu: LRQ-260204-001                                       │
│  Phòng: P102                                                   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ DANH SÁCH ĐỒ GIẶT                                         │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ Ga trải giường             x 2                            │ │
│  │ Vỏ gối                     x 4                            │ │
│  │ Khăn tắm lớn               x 2                            │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ Tổng cộng                  8 món                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 📦 LÔ GIẶT NHÁP: LB-260204-001                            │ │
│  │    Hiện có: 24 món                                        │ │
│  │    Sau khi thêm: 32 món                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                            [Hủy]     [Xác nhận thêm]           │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Cập nhật RPC để kiểm tra và xử lý draft batch đúng cách

```sql
-- Kiểm tra nếu KHÔNG có draft batch → Yêu cầu tạo batch mới
-- Hiện tại: Tự động tạo draft nếu chưa có → ĐỔI thành:
-- Option A: Yêu cầu user tạo batch trước với đầy đủ thông tin (vendor, ngày giao)
-- Option B: Giữ nguyên auto-create nhưng thêm bước "Gửi lô giặt" để bổ sung thông tin
```

#### 3. Thêm flow "Gửi lô giặt" cho draft batch

Sau khi thêm đủ items vào draft batch → User cần "Gửi lô giặt":

```text
┌─────────────────────────────────────────────────────────────────┐
│  GỬI LÔ GIẶT                                           [×]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Lô giặt: LB-260204-001                                        │
│  Số lượng: 32 món                                              │
│                                                                 │
│  Đơn vị giặt: *                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Chọn đơn vị giặt                                    ▼   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Ngày giao: *               Dự kiến nhận:                      │
│  ┌──────────────┐           ┌──────────────┐                   │
│  │ 04/02/2026   │           │ 06/02/2026   │                   │
│  └──────────────┘           └──────────────┘                   │
│                                                                 │
│  Người giao: *                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Chọn nhân viên                                      ▼   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Tên người nhận tại đơn vị giặt: *                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                        [Hủy]     [Gửi đi giặt]                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### FILES CẦN THAY ĐỔI

| File | Thay đổi | Độ phức tạp |
|------|----------|-------------|
| `src/components/laundry/AddToLaundryBatchDialog.tsx` | MỚI - Dialog xác nhận trước khi thêm | Trung bình |
| `src/components/laundry/SendLaundryBatchDialog.tsx` | MỚI - Dialog gửi lô giặt (draft → delivered) | Cao |
| `src/components/laundry/LaundryRequestsTab.tsx` | Tích hợp dialog xác nhận, thêm nút "Gửi lô giặt" | Trung bình |
| `src/hooks/useLaundryBatches.ts` | Thêm mutation `useSendDraftBatch` | Trung bình |
| Database Migration | Cập nhật RPC `send_draft_batch` - cập nhật vendor, dates, status | Cao |

---

### CHI TIẾT KỸ THUẬT

#### 1. AddToLaundryBatchDialog.tsx

```typescript
interface AddToLaundryBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: LaundryRequest
  draftBatch: DraftBatch | null
  onConfirm: () => void
  isLoading: boolean
}

export function AddToLaundryBatchDialog({...}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận thêm vào lô giặt</AlertDialogTitle>
        </AlertDialogHeader>
        
        {/* Request info */}
        <div>
          <p>Yêu cầu: {request.request_code}</p>
          <p>Phòng: {request.room?.room_number}</p>
        </div>
        
        {/* Items list */}
        <div>
          {request.items.map(item => (
            <div key={item.item_id}>
              {item.item_name} x {item.quantity}
            </div>
          ))}
          <div>Tổng: {request.total_quantity} món</div>
        </div>
        
        {/* Draft batch info */}
        {draftBatch ? (
          <div className="bg-blue-50 p-3 rounded">
            <p>Lô giặt: {draftBatch.batch_code}</p>
            <p>Hiện có: {draftBatch.total_items} món</p>
            <p>Sau khi thêm: {draftBatch.total_items + request.total_quantity} món</p>
          </div>
        ) : (
          <div className="bg-amber-50 p-3 rounded">
            <p>Sẽ tạo lô giặt nháp mới</p>
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            Xác nhận thêm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

#### 2. SendLaundryBatchDialog.tsx

```typescript
interface SendLaundryBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: DraftBatch
  onSuccess: () => void
}

const sendBatchSchema = z.object({
  vendor_id: z.string().uuid('Vui lòng chọn đơn vị giặt'),
  delivery_date: z.date(),
  expected_return_date: z.date(),
  delivery_staff_id: z.string().uuid('Vui lòng chọn người giao'),
  receiver_name: z.string().min(2, 'Vui lòng nhập tên người nhận'),
})

export function SendLaundryBatchDialog({...}) {
  const form = useForm({
    resolver: zodResolver(sendBatchSchema),
    defaultValues: {
      delivery_date: new Date(),
      expected_return_date: addDays(new Date(), 2),
    }
  })
  
  const sendBatch = useSendDraftBatch()
  
  const onSubmit = (data) => {
    sendBatch.mutate({
      batchId: batch.id,
      ...data,
    }, {
      onSuccess: () => {
        onSuccess()
        toast.success('Đã gửi lô giặt đi')
      }
    })
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Form với vendor, dates, staff, receiver_name */}
    </Dialog>
  )
}
```

#### 3. Database RPC: send_draft_batch

```sql
CREATE OR REPLACE FUNCTION public.send_draft_batch(
  p_batch_id UUID,
  p_vendor_id UUID,
  p_delivery_date DATE,
  p_expected_return_date DATE,
  p_delivery_staff_id UUID,
  p_receiver_name TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch RECORD;
  v_vendor RECORD;
  v_price_per_kg NUMERIC;
  v_estimated_cost NUMERIC;
BEGIN
  -- Get batch (must be draft)
  SELECT * INTO v_batch FROM laundry_batches WHERE id = p_batch_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;
  
  IF v_batch.status != 'draft' THEN
    RAISE EXCEPTION 'Only draft batches can be sent';
  END IF;
  
  -- Get vendor for pricing
  SELECT * INTO v_vendor FROM laundry_vendors WHERE id = p_vendor_id;
  v_price_per_kg := COALESCE((v_vendor.contract_info->>'price_per_kg')::numeric, 0);
  v_estimated_cost := COALESCE(v_batch.total_weight_kg, 0) * v_price_per_kg;
  
  -- Update batch
  UPDATE laundry_batches SET
    vendor_id = p_vendor_id,
    delivery_date = p_delivery_date,
    expected_return_date = p_expected_return_date,
    delivery_staff_id = p_delivery_staff_id,
    receiver_name = p_receiver_name,
    notes = COALESCE(p_notes, notes),
    estimated_cost = v_estimated_cost,
    status = 'delivered',
    updated_at = now()
  WHERE id = p_batch_id;
  
  -- Update vendor stats
  UPDATE laundry_vendors SET
    total_orders = COALESCE(total_orders, 0) + 1,
    total_value = COALESCE(total_value, 0) + v_estimated_cost,
    updated_at = now()
  WHERE id = p_vendor_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'status', 'delivered'
  );
END;
$$;
```

---

### QUY TRÌNH SAU KHI SỬA

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. ROOM CHECK → Tạo laundry_request (pending)                                │
│    └── Inventory đã cập nhật: stock -, laundry +                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. XEM YÊU CẦU GIẶT                                                          │
│    ├── Click "Thêm vào lô giặt nháp"                                        │
│    └── Dialog xác nhận hiển thị (items, tổng, thông tin draft batch)        │
│        └── Confirm → Thêm vào draft batch                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. KHI ĐỦ ITEMS → "GỬI LÔ GIẶT"                                              │
│    ├── Dialog yêu cầu: vendor, ngày giao, người giao, người nhận            │
│    └── Confirm → status: draft → delivered                                  │
│        └── Inventory: KHÔNG THAY ĐỔI (đã update ở step 1)                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 4. TIẾP TỤC QUY TRÌNH CHUẨN                                                  │
│    delivered → ready → received → stocked                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### KẾT QUẢ MONG ĐỢI

| Metric | Hiện tại | Sau khi sửa |
|--------|----------|-------------|
| Xác nhận trước khi thêm | Không | Có dialog xác nhận |
| Thông tin draft batch | Không hiển thị | Hiển thị số lượng hiện có/sau khi thêm |
| Gửi lô giặt | Không có | Có dialog yêu cầu đầy đủ thông tin |
| Vendor cho draft batch | Thiếu | Bổ sung khi gửi |
| Flow hoàn chỉnh | Không | draft → delivered với đầy đủ data |
