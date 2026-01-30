
## Kế hoạch Cải thiện UI - Trang Danh sách Phiếu Giao Hàng

### I. ĐÁNH GIÁ HIỆN TRẠNG

Trang `/inventory/distributions` hiện đã có:
- ✅ Pending Supplements Banner với multi-select
- ✅ Quick Create Dropdown với badge đếm
- ✅ Filter Card với search và các bộ lọc
- ✅ Table view (Desktop) và Card view (Mobile)

### II. VẤN ĐỀ CẦN CẢI THIỆN

| # | Vấn đề | Vị trí | Mức độ |
|---|--------|--------|--------|
| 1 | **Status Badge dùng màu nền** | `DistributionStatusBadge.tsx` | Cao |
| 2 | **Card có border + hover state chưa tối ưu** | `DistributionOrderCard.tsx` | Trung bình |
| 3 | **Table header text-xs quá nhỏ** | `DistributionOrderTable.tsx` | Thấp |
| 4 | **Progress bar trong table chiếm diện tích** | `DistributionOrderTable.tsx` | Trung bình |
| 5 | **Eye button trong table không cần thiết** | `DistributionOrderTable.tsx` | Thấp |
| 6 | **Supplement Banner cards quá nhiều màu nền** | `PendingSupplementsBanner.tsx` | Trung bình |

### III. PHƯƠNG ÁN CẢI THIỆN

#### 3.1. Status Badge - Chuyển sang Semantic Text Color

**Trước (dùng Badge với background):**
```text
┌─────────────────────────────────────────┐
│ [Chờ giao]   [Đang giao]   [Hoàn thành] │
│ (outline)    (default)     (secondary)  │
└─────────────────────────────────────────┘
```

**Sau (dùng text color + icon):**
```text
┌─────────────────────────────────────────┐
│ ⏱ Chờ giao   🚚 Đang giao   ✓ Hoàn thành│
│ text-muted   text-blue-600  text-green-600
└─────────────────────────────────────────┘
```

**Mapping màu:**
- `pending`: `text-muted-foreground` (chờ)
- `released`: `text-blue-600` (đã giao cho NV)
- `in_progress`: `text-amber-600` (đang giao)
- `completed`: `text-green-600` (hoàn thành)
- `cancelled`: `text-red-600` (đã hủy)

#### 3.2. Distribution Order Card - Compact & Clean

**Trước:**
```text
┌─────────────────────────────────────────────────────────┐
│ Card border rounded-lg p-3                              │
│ ┌─────────────────────────────────────────────────────┐│
││ DIS-2024001           [Badge: Đang giao]             ││
│├─────────────────────────────────────────────────────┤│
││ Phòng: 3/5            Sản phẩm: 12                   ││
│├─────────────────────────────────────────────────────┤│
││ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (Progress)  ││
│├─────────────────────────────────────────────────────┤│
││ Nguyễn Văn A                           30/01 14:30   ││
│└─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Sau:**
```text
┌─────────────────────────────────────────────────────────┐
│ div border-b hover:bg-muted/30 py-2.5 px-3             │
│                                                         │
│ DIS-2024001  3/5 phòng  12 SP   🚚 Đang giao           │
│ Nguyễn Văn A • 30/01 14:30      ████████░░░ 60%        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Thay đổi chính:**
- Bỏ Card wrapper → dùng div với border-b
- Status không dùng Badge → text color semantic
- Progress bar inline với thông tin chính
- Layout 2 dòng thay vì 4 sections

#### 3.3. Distribution Order Table - Simplified

**Trước:**
```text
| Mã phiếu | Trạng thái | Tiến độ | SP | Người giao | Người tạo | Ngày | [👁] |
```

**Sau:**
```text
| Mã phiếu | Trạng thái | Tiến độ | Người giao | Ngày tạo |
```

**Thay đổi:**
- Bỏ cột "Sản phẩm" (ít quan trọng, có thể xem trong detail)
- Bỏ cột "Người tạo" (ít quan trọng)
- Bỏ nút Eye (click row đã navigate)
- Status dùng text color thay Badge
- Progress hiển thị compact: "3/5" thay vì progress bar + text

#### 3.4. Pending Supplements Banner - Less Colorful

**Trước (SupplementCard có nhiều màu):**
```text
┌─────────────────────────────────────────┐
│ border-primary bg-primary/5 ring-primary│ (selected)
│ border-border bg-background             │ (unselected)
│ Badge variant="outline" cho type        │
└─────────────────────────────────────────┘
```

**Sau:**
```text
┌─────────────────────────────────────────┐
│ border-l-4 border-l-primary             │ (selected)
│ border-l-4 border-l-transparent         │ (unselected)
│ type label = text color semantic        │
└─────────────────────────────────────────┘
```

### IV. CHI TIẾT TRIỂN KHAI

#### 4.1. DistributionStatusBadge.tsx → OrderStatusText

**Thay đổi:**
- Tạo variant mới `OrderStatusText` dùng text color thay Badge
- Giữ `OrderStatusBadge` cho backward compatibility
- Export cả 2 để các component khác có thể chọn

```typescript
// Text-only status display (minimalist)
export function OrderStatusText({ status }: { status: DistributionOrderStatus }) {
  const config = {
    pending: { label: 'Chờ giao', icon: Clock, className: 'text-muted-foreground' },
    released: { label: 'Đã giao NV', icon: PackageCheck, className: 'text-blue-600' },
    in_progress: { label: 'Đang giao', icon: Truck, className: 'text-amber-600' },
    completed: { label: 'Hoàn thành', icon: CheckCircle, className: 'text-green-600' },
    cancelled: { label: 'Đã hủy', icon: XCircle, className: 'text-red-600' },
  }
  // ...render icon + text with className
}
```

#### 4.2. DistributionOrderCard.tsx - Compact Layout

**Thay đổi:**
- Bỏ border rounded-lg → chỉ border-b
- Layout 2 rows thay vì nhiều sections
- Status dùng `OrderStatusText` thay Badge
- Progress bar nhỏ hơn (w-12 h-1) inline với row 2

#### 4.3. DistributionOrderTable.tsx - Fewer Columns

**Thay đổi:**
- Remove columns: Sản phẩm, Người tạo, Action button
- Status dùng `OrderStatusText`
- Progress hiển thị "3/5" text thay vì Progress component
- Giữ: Mã phiếu, Trạng thái, Tiến độ, Người giao, Ngày

#### 4.4. PendingSupplementsBanner.tsx - Subtle Cards

**Thay đổi:**
- SupplementCard dùng border-left semantic thay background
- Bỏ Badge cho type → text color semantic
- Reduce padding p-2 → py-1.5 px-2

### V. FILE CHANGES

| File | Thay đổi |
|------|----------|
| `DistributionStatusBadge.tsx` | Thêm `OrderStatusText` component |
| `DistributionOrderCard.tsx` | Refactor layout compact, dùng OrderStatusText |
| `DistributionOrderTable.tsx` | Bỏ cột, dùng OrderStatusText, bỏ Eye button |
| `PendingSupplementsBanner.tsx` | SupplementCard dùng border-l semantic |

### VI. TRƯỚC/SAU SO SÁNH

| Tiêu chí | Trước | Sau |
|----------|-------|-----|
| Status display | Badge với màu nền | Text với màu semantic |
| Card layout | 4 sections riêng biệt | 2 rows compact |
| Table columns | 8 cột | 5 cột |
| Progress display | Progress bar + text | Text only hoặc bar nhỏ |
| Eye button | Có | Bỏ (click row để navigate) |
| Supplement cards | Background colors | Border-left semantic |

### VII. KẾT QUẢ MONG ĐỢI

- **Tăng information density**: Hiển thị nhiều phiếu hơn trên cùng diện tích
- **Giảm visual noise**: Bớt màu sắc, focus vào nội dung
- **Consistent design**: Đồng nhất với các trang khác đã cải thiện
- **Better scannability**: Dễ quét mắt tìm thông tin quan trọng
