
## Kế hoạch Gộp Views - Unified Room List

### I. PHÂN TÍCH HIỆN TRẠNG

**2 Views hiện tại:**

| Component | Mục đích | Vấn đề |
|-----------|----------|--------|
| `StaffDeliveryView` | Flat list cho nhân viên giao | Duplicate code với StopCard |
| `BatchAccordion` | Group by batch với accordion | Quá phức tạp, ít giá trị cho user |

**Logic trùng lặp:**
- `StaffRoomCard` và `StopCard` cùng render thông tin phòng
- Dialog "Cannot Access" và "Handover" duplicate ở 2 nơi
- Progress tracking ở cả 2 views

### II. GIẢI PHÁP: UNIFIED ROOM LIST

Gộp thành **1 view duy nhất** hiển thị flat list rooms, với optional batch header khi có nhiều batches.

```text
┌─────────────────────────────────────────────────────────────────┐
│ [DeliveryStepWizard - Compact]                                  │
├─────────────────────────────────────────────────────────────────┤
│ [Compact Info Header - Tầng, Ngày, NV, Progress]                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ─── Batch 1 (2 phòng) ─── (optional divider, chỉ khi >1 batch)  │
│                                                                 │
│ P.101  1 SP • 1 đơn vị            [GIAO]                       │
│ ───────────────────────────────────────────────────────────────│
│ P.102  18 SP • 22 đơn vị          [GIAO]                       │
│ ───────────────────────────────────────────────────────────────│
│                                                                 │
│ (nếu có Batch 2, hiển thị divider)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### III. THAY ĐỔI CHI TIẾT

#### 3.1. RouteDetailView.tsx

**Bỏ:**
- State `viewMode`
- Tabs toggle (Danh sách phòng / Xem theo Batch)
- Import `Tabs, TabsList, TabsTrigger`
- Import `BatchAccordion`
- `useEffect` auto-switch view mode

**Thay thế:**
- Chỉ render 1 component: `UnifiedRoomList`
- Bỏ Card wrapper cho content

#### 3.2. Tạo UnifiedRoomList.tsx (mới)

**Tính năng:**
- Flat list các phòng, sort theo: pending → cannot_access → delivered/resolved
- Nếu có nhiều batch (>1), hiển thị divider text nhỏ giữa các batch
- Sử dụng `StopCard` (đã tối ưu) cho mỗi phòng
- Bỏ `StaffDeliveryView` và `StaffRoomCard` (không còn cần)

```typescript
interface UnifiedRoomListProps {
  stops: RouteStop[]
  orderCode?: string
  tenantId?: string
  hotelId?: string
  orderStatus: string
  isAssignee: boolean
  onRefresh?: () => void
}
```

#### 3.3. Đơn giản hóa StopCard.tsx

**Giữ nguyên:**
- Tất cả logic actions (deliver, cannot_access, retry, return, handover)
- Mobile optimizations (h-12 buttons, dropdown)
- Dialogs

**Cải thiện:**
- Bỏ background colors (bg-green-50) → Chỉ dùng border-l semantic
- Items hiển thị inline thay vì collapsible details
- Giảm padding để compact hơn

### IV. FILES THAY ĐỔI

| File | Hành động |
|------|-----------|
| `RouteDetailView.tsx` | Bỏ tabs, chỉ render UnifiedRoomList |
| `UnifiedRoomList.tsx` | **MỚI** - Gộp logic từ StaffDeliveryView + BatchAccordion |
| `StopCard.tsx` | Refactor UI compact, bỏ bg colors |
| `StaffDeliveryView.tsx` | **XÓA** (không còn cần) |
| `BatchAccordion.tsx` | **GIỮ LẠI** cho reference nhưng không import |

### V. LOGIC KIỂM TRA

**Permission flow (giữ nguyên):**

1. **Khi order status = `pending`**:
   - Không ai có thể deliver
   - Chờ kho release

2. **Khi order status = `released`**:
   - Assignee nhận hàng (confirm receive order)
   - Sau khi nhận → status chuyển `in_progress`

3. **Khi order status = `in_progress`**:
   - Assignee có thể: Deliver, Mark Cannot Access
   - Sau khi cannot_access: Retry, Return to Stock, Handover

4. **Khi order status = `completed`**:
   - Không action nào available
   - Chỉ xem thông tin

**Validation trong UnifiedRoomList:**
```typescript
const canDeliverStops = isAssignee && orderStatus === 'in_progress'
// Permission cho từng stop check trong StopCard dựa vào stop_status
```

### VI. UI SAU CẢI THIỆN

**Trước:**
```text
[Tab: Danh sách phòng] [Tab: Xem theo Batch]

┌─ Card ──────────────────────────────────────┐
│ Danh sách Batch (title)                     │
│ ┌─ Accordion ──────────────────────────────┐│
│ │ ▶ Batch 1 [Chờ giao] 2 phòng ▲          ││
│ │  ┌─ StopCard ────────────────────────┐  ││
│ │  │ 🚪 P101 [Chờ giao]                │  ││
│ │  │ ...                               │  ││
│ │  └───────────────────────────────────┘  ││
│ └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Sau:**
```text
(Không có tabs)

┌─ border rounded-lg ────────────────────────────────┐
│ P.101  Khăn tắm x1, Dầu gội x2    [GIAO]         │
├────────────────────────────────────────────────────┤
│ P.102  18 sản phẩm                [GIAO]         │
├────────────────────────────────────────────────────┤
│ P.103  ✓ Đã giao                  text-green-600  │
└────────────────────────────────────────────────────┘
```

### VII. TRIỂN KHAI

**Bước 1:** Tạo `UnifiedRoomList.tsx` với logic gộp
**Bước 2:** Refactor `StopCard.tsx` - compact UI, bỏ bg colors
**Bước 3:** Update `RouteDetailView.tsx` - bỏ tabs, dùng UnifiedRoomList
**Bước 4:** Test toàn bộ flow deliver/cannot_access/retry/handover
**Bước 5:** Cleanup files không dùng

### VIII. KẾT QUẢ

- **Giảm complexity**: Từ 2 views → 1 view
- **Giảm code duplication**: Bỏ StaffRoomCard trùng với StopCard
- **UI cleaner**: Không tabs, không accordion, flat list đơn giản
- **Giữ nguyên logic**: Tất cả actions và permissions hoạt động như cũ
