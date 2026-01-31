
## Kế hoạch: Thêm loại kiểm tra "Bổ sung đồ & Dọn dẹp"

### MỤC ĐÍCH

Thêm loại kiểm tra mới `replenish` để nhân viên:
- Báo đồ cần bổ sung (thiếu, hết)
- Báo tình trạng phòng (sạch/bẩn/rất bẩn)
- Tạo yêu cầu dọn dẹp nếu cần

Loại này sẽ được dùng cho **kiểm tra nhanh hàng ngày** và **kiểm tra trước khi khách checkout** (cho nhân viên không có quyền làm checkout đầy đủ).

---

### LUỒNG KIỂM TRA

```text
Bước 1: Chọn loại kiểm tra
         ↓
Bước 2: Kiểm tra đồ cần bổ sung + Tình trạng dọn dẹp
         (Gộp: Items thiếu/hết + CleaningRequest)
         ↓
Bước 3: Đánh giá & Hoàn tất
```

**3 bước đơn giản**, tương tự luồng `delivery` nhưng:
- Không cần distribution order
- Hiển thị tất cả đồ dùng trong phòng (không chỉ đồ giao)
- Tập trung vào actions: OK, Thiếu, Hết, Thêm

---

### CHI TIẾT TRIỂN KHAI

#### 1. Thêm Check Type mới: `replenish`

**File: `src/lib/roomCheckConfig.ts`**

```typescript
export type CheckType = 'daily' | 'checkin' | 'checkout' | 'maintenance' | 'delivery' | 'replenish'

replenish: {
  label: 'Bổ sung đồ & Dọn dẹp',
  description: 'Báo đồ cần bổ sung và tình trạng phòng',
  headerColor: 'bg-teal-50 border-teal-200',
  headerTextColor: 'text-teal-700',
  linenActions: ['ok', 'missing', 'add'],        // OK, Thiếu, Thêm
  consumableActions: ['ok', 'empty', 'missing'], // OK, Hết, Thiếu
  equipmentActions: ['ok', 'damaged'],           // OK, Hỏng (báo cáo)
  furnitureActions: ['ok', 'damaged'],
  showBookingInfo: false,
  allowDamageCharges: false,
  blockOnDamaged: false,
  requireInspection: false,
}
```

#### 2. Cập nhật Types

**Files cần sửa:**
- `src/types/rooms.types.ts`: Thêm `replenish` vào CheckType
- `src/lib/validations/rooms.schemas.ts`: Thêm `replenish` vào enum

#### 3. Cập nhật CheckTypeStep - Thêm nút mới

**File: `src/components/rooms/check-steps/CheckTypeStep.tsx`**

Thêm option mới với icon `RefreshCw` hoặc `PackagePlus`:

```typescript
{
  value: 'replenish',
  label: 'Bổ sung & Dọn dẹp',
  shortLabel: 'Bổ sung',
  icon: PackagePlus,  // hoặc RefreshCw
}
```

Hiển thị option này cho tất cả user (không ẩn như delivery).

#### 4. Cập nhật RoomCheckPage - Luồng 3 bước

**File: `src/pages/rooms/RoomCheckPage.tsx`**

**Thay đổi logic:**

```typescript
// Thêm flag cho replenish type
const isReplenishType = watchedCheckType === 'replenish'

// Cập nhật số bước
const getTotalSteps = () => {
  if (quickMode) return 2
  if (isCheckoutType) return 6
  if (isDeliveryType) return 3
  if (isReplenishType) return 3  // NEW: Items+Cleaning -> Review
  return 3
}
```

**Render Step 2 cho replenish:**
- Hiển thị `ItemsCheckStep` với actions: ok, missing, empty, add
- Kèm `CleaningRequestStep` ở dưới (tương tự delivery)

**Không cần component mới** - tái sử dụng `ItemsCheckStep` với config từ `replenish`.

#### 5. Cập nhật CHECK_TYPE_ICONS

**File: `src/pages/rooms/RoomCheckPage.tsx`**

```typescript
import { PackagePlus } from 'lucide-react'

const CHECK_TYPE_ICONS: Record<CheckType, any> = {
  daily: ClipboardCheck,
  checkin: LogIn,
  checkout: LogOut,
  maintenance: Settings,
  delivery: Package,
  replenish: PackagePlus,  // NEW
}
```

---

### TÓM TẮT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/lib/roomCheckConfig.ts` | Thêm type `replenish` + config |
| `src/types/rooms.types.ts` | Thêm `replenish` vào CheckType |
| `src/lib/validations/rooms.schemas.ts` | Thêm `replenish` vào enum |
| `src/components/rooms/check-steps/CheckTypeStep.tsx` | Thêm nút chọn mới |
| `src/pages/rooms/RoomCheckPage.tsx` | Thêm logic xử lý replenish (3 bước) |

---

### SO SÁNH CÁC LOẠI KIỂM TRA

| Loại | Mục đích | Số bước | Actions chính |
|------|----------|---------|---------------|
| daily | Kiểm tra đầy đủ hàng ngày | 3 | OK, Đổi |
| checkin | Chuẩn bị phòng cho khách | 3 | OK, Thiếu, Thêm |
| checkout | Tính phí + Bổ sung + Dọn dẹp | 6 | Full actions (2 giai đoạn) |
| maintenance | Sau sửa chữa | 3 | OK, Thiếu, Hỏng |
| delivery | Sau giao hàng (từ phiếu) | 3 | OK, Thêm, Đổi |
| **replenish** | **Bổ sung nhanh + Dọn dẹp** | **3** | **OK, Thiếu, Hết, Thêm + Cleaning** |

---

### KẾT QUẢ MONG ĐỢI

1. **UI**: Nút mới "Bổ sung" xuất hiện trong bước chọn loại kiểm tra (cùng hàng với Daily, Check-in, Check-out, Bảo trì)

2. **Luồng 3 bước đơn giản**:
   - Bước 1: Chọn loại → Bổ sung đồ & Dọn dẹp
   - Bước 2: Kiểm tra đồ thiếu/hết + Tình trạng dọn dẹp (gộp 1 màn hình)
   - Bước 3: Đánh giá sao + Hoàn tất

3. **Tạo request tự động**: Khi submit, hệ thống tạo:
   - `supplement_requests` cho đồ thiếu/hết cần bổ sung
   - `housekeeping_tasks` cho yêu cầu dọn dẹp (nếu needs_cleaning = true)
