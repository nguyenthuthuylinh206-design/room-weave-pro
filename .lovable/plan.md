

## Kế hoạch: Sửa lỗi UI không cập nhật sau khi chỉnh sửa phiếu + Cải thiện hiển thị chi tiết items

### I. PHÂN TÍCH VẤN ĐỀ

**Vấn đề 1: UI không cập nhật sau khi sửa phiếu**
- Hook `useUpdateDistributionOrder` chỉ invalidate `distribution-order-detail` 
- Nhưng `RouteDetailView` dùng hook `useRouteDetail` với queryKey `route-detail`
- Kết quả: Sau khi lưu thay đổi, `UnifiedRoomList` không refresh vì data không được invalidate

**Vấn đề 2: Hiển thị items không trực quan**
- Hiện tại chỉ hiển thị dạng text ngắn: "Adapter đa năng x2, Ấm đun nước x1..."
- Khi có nhiều items (>3), chỉ hiển thị tóm tắt: "20 sản phẩm • 24 đơn vị"
- Nhân viên khó nhìn chi tiết để kiểm tra đúng hàng

### II. GIẢI PHÁP

#### 2.1. Fix Cache Invalidation

**File: `src/hooks/useDistributionOrders.ts`**

Thêm `route-detail` vào danh sách invalidateQueries trong `useUpdateDistributionOrder`:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
  queryClient.invalidateQueries({ queryKey: ['distribution-order-detail'] })
  queryClient.invalidateQueries({ queryKey: ['route-detail'] })  // THÊM
  queryClient.invalidateQueries({ queryKey: ['items'] })
  toast.success('Cập nhật phiếu giao hàng thành công')
},
```

#### 2.2. Cải thiện UI hiển thị Items trong RoomCard

**File: `src/components/distribution/components/UnifiedRoomList.tsx`**

Thay đổi từ inline text thành collapsible list:

**Thiết kế mới:**

```text
TRƯỚC (inline text):
┌─────────────────────────────────────────────────────────────┐
│ P101 ✓  Adapter đa năng x2, Ấm đun nước x1...     [GIAO]   │
└─────────────────────────────────────────────────────────────┘

SAU (expandable list):
┌─────────────────────────────────────────────────────────────┐
│ P101 ▼  20 sản phẩm • 24 đơn vị                    [GIAO]  │
├─────────────────────────────────────────────────────────────┤
│   • Adapter đa năng                                    x2  │
│   • Ấm đun nước                                        x1  │
│   • Bàn chải đánh răng                                 x2  │
│   • Bàn chải vệ sinh                                   x1  │
│   • Bông tẩy trang                                     x1  │
│   • Dao cạo râu                                        x1  │
│   • Dầu gội đầu                                        x1  │
│   • Dầu xả                                             x1  │
│   • Ga chun 180x200x20cm                               x1  │
│   • Giá treo khăn                                      x1  │
│   • ...                                                    │
└─────────────────────────────────────────────────────────────┘
```

**Logic:**
- Click vào row để expand/collapse danh sách items
- Mặc định: Hiển thị 1 dòng tóm tắt với icon chevron
- Expanded: Hiển thị toàn bộ items với số lượng
- Màu sắc: Items đã giao (quantity_confirmed > 0) hiển thị màu xanh

### III. THAY ĐỔI CHI TIẾT

#### 3.1. `useDistributionOrders.ts` - Fix invalidation

```typescript
// Line ~352-357
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
  queryClient.invalidateQueries({ queryKey: ['distribution-order-detail'] })
  queryClient.invalidateQueries({ queryKey: ['route-detail'] })  // THÊM
  queryClient.invalidateQueries({ queryKey: ['route-batches'] })  // THÊM
  queryClient.invalidateQueries({ queryKey: ['items'] })
  toast.success('Cập nhật phiếu giao hàng thành công')
},
```

#### 3.2. `UnifiedRoomList.tsx` - Cải thiện RoomCard

**Thêm state cho expanded rooms:**
```typescript
const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set())

const toggleExpand = (roomId: string) => {
  setExpandedRooms(prev => {
    const next = new Set(prev)
    if (next.has(roomId)) {
      next.delete(roomId)
    } else {
      next.add(roomId)
    }
    return next
  })
}
```

**Truyền props cho RoomCard:**
```typescript
<RoomCard
  // ... existing props
  isExpanded={expandedRooms.has(stop.id)}
  onToggleExpand={() => toggleExpand(stop.id)}
/>
```

**Cập nhật RoomCard UI:**
```tsx
function RoomCard({
  stop,
  isExpanded,
  onToggleExpand,
  // ... other props
}: RoomCardProps) {
  const itemsCount = stop.items.length
  const totalQty = stop.items.reduce((sum, i) => sum + i.quantity, 0)
  const summaryText = `${itemsCount} sản phẩm • ${totalQty} đơn vị`

  return (
    <div className="...">
      {/* Header row - always visible */}
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          isExpanded && "rotate-180"
        )} />
        <span className="font-bold">{stop.room_number}</span>
        <span className="text-xs text-muted-foreground">{summaryText}</span>
        {/* Action button */}
      </div>

      {/* Expanded items list */}
      {isExpanded && (
        <div className="mt-2 pl-6 space-y-1 border-l-2 border-muted ml-2">
          {stop.items.map(item => (
            <div 
              key={item.id}
              className="flex items-center justify-between text-sm py-0.5"
            >
              <span className={cn(
                item.quantity_confirmed > 0 && "text-green-600"
              )}>
                {item.item_name}
              </span>
              <span className="font-mono text-xs">
                x{item.quantity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### IV. FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/hooks/useDistributionOrders.ts` | Thêm invalidate `route-detail` và `route-batches` |
| `src/components/distribution/components/UnifiedRoomList.tsx` | Thêm expand/collapse cho items list |

### V. UI/UX TRỰC QUAN

**Mobile - Expanded state:**
```text
┌────────────────────────────────────────────────────┐
│ ▼ P101    20 sản phẩm • 24 đơn vị          [GIAO] │
│ ├─────────────────────────────────────────────────│
│ │  Adapter đa năng                            x2  │
│ │  Ấm đun nước                                x1  │
│ │  Bàn chải đánh răng                         x2  │
│ │  Bàn chải vệ sinh                           x1  │
│ │  Bông tẩy trang                             x1  │
│ │  Dao cạo râu                                x1  │
│ │  Dầu gội đầu                                x1  │
│ │  Dầu xả                                     x1  │
│ │  Ga chun 180x200x20cm                       x1  │
│ │  Giá treo khăn                              x1  │
│ │  Giấy vệ sinh                               x1  │
│ │  Gương soi                                  x1  │
│ │  Kem đánh răng                              x1  │
│ │  Khăn tắm lớn                               x1  │
│ │  Lược chải tóc                              x3  │
│ │  Sữa tắm                                    x1  │
│ │  Tăm bông                                   x1  │
│ │  Vòi xịt vệ sinh                            x1  │
│ │  Xà phòng tắm                               x1  │
│ │  Xịt khử mùi                                x1  │
│ └─────────────────────────────────────────────────│
├────────────────────────────────────────────────────┤
│ ▶ P102    15 sản phẩm • 18 đơn vị          [GIAO] │
└────────────────────────────────────────────────────┘
```

**Desktop - Collapsed state:**
```text
┌────────────────────────────────────────────────────────────────┐
│ ▶ P101   20 sản phẩm • 24 đơn vị                       [GIAO] │
│ ▶ P102   15 sản phẩm • 18 đơn vị                       [GIAO] │
│ ▶ P103   12 sản phẩm • 15 đơn vị                       [GIAO] │
└────────────────────────────────────────────────────────────────┘
```

### VI. LỢI ÍCH

| Trước | Sau |
|-------|-----|
| UI không refresh sau khi edit | UI tự động cập nhật |
| Chỉ thấy text ngắn gọn | Có thể xem full danh sách items |
| Khó kiểm tra hàng đầy đủ | Dễ dàng check từng item |
| Phải vào Room Check để xem chi tiết | Xem ngay trên màn hình chính |

### VII. TÓM TẮT TRIỂN KHAI

1. **Fix cache**: Thêm `route-detail` và `route-batches` vào invalidateQueries của `useUpdateDistributionOrder`
2. **UI mới**: Thêm expand/collapse cho RoomCard với danh sách items chi tiết
3. **State**: Quản lý `expandedRooms` set để track rooms đang mở

