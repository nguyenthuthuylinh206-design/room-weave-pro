

## Kế hoạch Sửa Logic - Click Room trong Phiếu Giao Hàng

### I. VẤN ĐỀ HIỆN TẠI

Khi click vào **P101** trong phiếu giao hàng đang ở trạng thái **"chờ giao" (pending)**, hệ thống chuyển thẳng đến trang `/rooms/{room_id}/check` - đây là trang **kiểm tra phòng** (Room Check).

**Điều này không đúng logic** vì:

| Trạng thái phiếu | Cho phép click room? | Mục đích click |
|------------------|---------------------|----------------|
| `pending` | KHÔNG nên | Chưa có hàng để giao |
| `released` | KHÔNG nên | Nhân viên chưa xác nhận nhận hàng |
| `in_progress` | CÓ | Giao hàng đến phòng |
| `completed` | CÓ (chỉ xem) | Xác nhận bổ sung đúng vị trí |

### II. QUY TRÌNH GIAO HÀNG CHUẨN

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: TẠO PHIẾU GIAO HÀNG                                                  │
│ ────────────────────────────                                                 │
│ • Nhân viên kho hoặc quản lý tạo phiếu từ supplement requests                │
│ • Phiếu status = "pending"                                                   │
│ • Các room_order status = "pending"                                          │
│ • Giao cho nhân viên (assigned_to)                                           │
│                                                                              │
│ → Lúc này: KHÔNG AI có thể giao đồ vào phòng                                │
│ → Click room: Chỉ XEM thông tin, không navigate đến Room Check              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 2: GIAO PHIẾU CHO NHÂN VIÊN (Handover Batch)                            │
│ ────────────────────────────────────────────────────                         │
│ • Quản lý kho (Storekeeper) lấy hàng theo danh sách                          │
│ • Click "Giao hàng cho nhân viên"                                            │
│ • Batch status = "open" → "handed_over"                                      │
│ • Phiếu status = "pending" → "released"                                      │
│                                                                              │
│ → Lúc này: Nhân viên nhận được thông báo có hàng chờ nhận                   │
│ → Click room: Vẫn không thể giao (chờ nhân viên confirm nhận hàng)          │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 3: NHÂN VIÊN XÁC NHẬN NHẬN HÀNG (Confirm Receive)                       │
│ ────────────────────────────────────────────────────────                     │
│ • Assignee click "Xác nhận đã nhận đủ hàng"                                  │
│ • Phiếu status = "released" → "in_progress"                                  │
│                                                                              │
│ → Lúc này: Nhân viên có thể bắt đầu giao đồ đến từng phòng                  │
│ → Click room: Mở trang Room Check để ghi nhận bổ sung                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 4: GIAO ĐỒ ĐẾN PHÒNG (Deliver Stop)                                     │
│ ──────────────────────────────────────────                                   │
│ • Nhân viên đến phòng                                                        │
│ • HOẶC: Click nút "GIAO" → Xác nhận đã giao (không vào phòng)               │
│ • HOẶC: Click room number → Vào Room Check để ghi nhận chi tiết             │
│ • Room order status = "pending" → "delivered"                                │
│                                                                              │
│ → Khi giao: Auto trigger update_room_items_for_distribution                 │
│   (Cập nhật room_items với quantity mới)                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 5: XÁC NHẬN BỔ SUNG ĐÚNG VỊ TRÍ (Confirm Room Delivery)                 │
│ ────────────────────────────────────────────────────────────                 │
│ • Nhân viên buồng (hoặc quản lý) vào phòng kiểm tra                          │
│ • Xác nhận đồ đã được bổ sung đúng vị trí                                   │
│ • Room order status = "delivered" → "confirmed"                              │
│                                                                              │
│ → Đây là xác nhận từ góc nhìn PHÒNG (RoomDistributionHistory)               │
│ → Khác với GIAO từ góc nhìn PHIẾU (UnifiedRoomList)                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### III. VẤN ĐỀ CODE HIỆN TẠI

**File: `UnifiedRoomList.tsx` (line 188-190)**

```typescript
const handleRoomClick = (stop: RouteStop) => {
  navigate(`/rooms/${stop.room_id}/check?distribution_order_id=${stop.distribution_order_id}&room_order_id=${stop.id}`)
}
```

**Vấn đề:**
1. Không check `orderStatus` trước khi cho phép navigate
2. Khi order đang `pending` hoặc `released`, không nên cho click vào phòng
3. Gây hiểu nhầm: "click để giao" trong khi chưa có hàng

### IV. PHƯƠNG ÁN SỬA

#### 4.1. Chặn Navigate khi Order chưa In Progress

**Thay đổi trong `UnifiedRoomList.tsx`:**

```typescript
// Truyền thêm prop orderStatus cho RoomCard
<RoomCard
  // ... existing props
  orderStatus={orderStatus}  // ← THÊM
/>

// Trong RoomCard, sửa handleRoomClick:
const handleRoomClick = () => {
  // Chỉ cho phép navigate khi order đang in_progress hoặc completed
  if (orderStatus !== 'in_progress' && orderStatus !== 'completed') {
    // Không navigate, có thể show toast hoặc không làm gì
    return
  }
  navigate(`/rooms/${stop.room_id}/check?...`)
}
```

#### 4.2. Thay đổi UI để phản ánh trạng thái

| Trạng thái | Click room | UI |
|------------|------------|-----|
| `pending` | Không clickable | Bỏ cursor-pointer, bỏ hover effect |
| `released` | Không clickable | Hiển thị "Chờ nhận hàng" |
| `in_progress` | Clickable → Room Check | Có cursor-pointer, ChevronRight |
| `completed` | Clickable → View | Xem chi tiết đã giao |

#### 4.3. Làm rõ mục đích click

Khi click vào phòng từ phiếu giao hàng:
- **Mục đích chính**: Mở Room Check để ghi nhận bổ sung đồ vào phòng
- **KHÔNG** phải để "deliver" - việc deliver được làm bằng nút "GIAO"

### V. FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `UnifiedRoomList.tsx` | Truyền `orderStatus` cho RoomCard, chặn navigate khi không phù hợp |
| `RoomCard` (trong UnifiedRoomList.tsx) | Thêm prop `orderStatus`, sửa `handleRoomClick`, sửa UI |

### VI. CHI TIẾT THAY ĐỔI

#### 6.1. RoomCardProps - Thêm orderStatus

```typescript
interface RoomCardProps {
  // ... existing props
  orderStatus: string  // ← THÊM
}
```

#### 6.2. RoomCard - Sửa logic click

```typescript
function RoomCard({
  // ... existing props
  orderStatus,  // ← THÊM
}: RoomCardProps) {
  // ...
  
  // Xác định có thể click hay không
  const canClickRoom = orderStatus === 'in_progress' || orderStatus === 'completed'
  
  // Handler click
  const handleRoomClick = () => {
    if (!canClickRoom) return
    onRoomClick()
  }
  
  return (
    <div className={...}>
      <div 
        className={cn(
          "flex items-center gap-2 min-w-0 flex-1",
          canClickRoom ? "cursor-pointer group" : "cursor-default"  // ← SỬA
        )}
        onClick={canClickRoom ? handleRoomClick : undefined}  // ← SỬA
      >
        {/* Room number */}
        <span className="text-sm font-bold shrink-0">{stop.room_number}</span>
        
        {/* ... items text ... */}
        
        {/* ChevronRight - chỉ hiện khi có thể click */}
        {canClickRoom && (
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      
      {/* ... rest of card ... */}
    </div>
  )
}
```

#### 6.3. Truyền prop từ map

```typescript
<RoomCard
  key={stop.id}
  stop={stop}
  // ... existing props
  orderStatus={orderStatus}  // ← THÊM từ UnifiedRoomList props
  // ...
/>
```

### VII. LOGIC TEST SCENARIOS

| # | Scenario | Order Status | Click Room | Expected |
|---|----------|--------------|------------|----------|
| 1 | Phiếu mới tạo | `pending` | Click P101 | Không navigate, không phản hồi |
| 2 | Đã giao NV | `released` | Click P101 | Không navigate |
| 3 | Đang giao | `in_progress` | Click P101 | Navigate → Room Check |
| 4 | Hoàn thành | `completed` | Click P101 | Navigate → View chi tiết |
| 5 | Nút GIAO | `in_progress` | Click "GIAO" | Deliver stop (không navigate) |

### VIII. TÓM TẮT FLOW CHUẨN

```text
PHIẾU GIAO HÀNG:
├── Tạo phiếu (pending)
│   └── Room: Không click được
├── Giao cho NV (released) 
│   └── Room: Không click được
├── NV nhận hàng (in_progress)
│   ├── Room: Click được → Mở Room Check
│   └── Nút GIAO: Click → Xác nhận đã giao
└── Hoàn thành (completed)
    └── Room: Click được → Xem chi tiết

XÁC NHẬN TẠI PHÒNG (RoomDistributionHistory):
└── Nhân viên buồng vào Room Detail
    └── Xem lịch sử giao hàng → Xác nhận bổ sung đúng
```

### IX. KẾT LUẬN

Việc click vào phòng khi phiếu đang `pending` là **không đúng logic** vì:
1. Hàng chưa được release từ kho
2. Nhân viên chưa nhận hàng
3. Không có gì để giao vào phòng

Cần chặn navigate và làm rõ UI để user hiểu trạng thái hiện tại.

