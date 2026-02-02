

## Kế hoạch: Hiển thị ShiftCheckInCard nổi bật hơn cho Nhân viên

### VẤN ĐỀ HIỆN TẠI

`ShiftCheckInCard` hiện chỉ hiển thị tại trang Dashboard (`/`). Nếu nhân viên truy cập trực tiếp vào các trang khác (như `/items`, `/rooms`, `/laundry`), họ sẽ **không thấy** card này.

**Yêu cầu ban đầu**: "hiển thị rõ ràng mỗi khi vào app" → Cần hiển thị ở vị trí cố định, luôn thấy được.

---

### GIẢI PHÁP: Thêm ShiftCheckInCard vào MobileHeader hoặc MainLayout

#### Phương án A: Banner nhỏ gọn trong MobileHeader (Đề xuất)

Thêm một banner/indicator nhỏ ngay dưới header trên **mọi trang** cho nhân viên chưa vào ca:

```text
┌────────────────────────────────────────┐
│ [Hotel Logo]  Hotel Name    🔔  ☰      │  ← MobileHeader
├────────────────────────────────────────┤
│ 🕐 Bạn chưa vào ca │ [Vào ca ngay →]  │  ← Banner mới (chỉ khi chưa check-in)
├────────────────────────────────────────┤
│                                        │
│         [Page Content]                 │  ← Outlet
│                                        │
└────────────────────────────────────────┘
```

**Khi đã vào ca**: Banner sẽ thu gọn hoặc ẩn đi, chỉ hiển thị indicator nhỏ.

#### Phương án B: Floating Action Button (FAB)

Thêm FAB cố định ở góc màn hình cho chức năng check-in/out.

---

### IMPLEMENTATION CHI TIẾT (Phương án A)

#### File cần tạo mới

**1. `src/components/staff/ShiftStatusBanner.tsx`**

Component banner nhỏ gọn hiển thị trạng thái ca:

```typescript
export function ShiftStatusBanner() {
  const { data: myStatus, isLoading } = useMyStaffStatus()
  const { mutate: checkIn, isPending } = useShiftCheckIn()
  
  const isOnShift = isCurrentlyOnShift(myStatus)
  
  // Không hiển thị nếu đã vào ca
  if (isOnShift) return null
  
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Bạn chưa vào ca</span>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          className="h-7 text-xs"
          onClick={() => checkIn()}
          disabled={isPending}
        >
          {isPending ? 'Đang xử lý...' : 'Vào ca ngay'}
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  )
}
```

#### Files cần sửa

**2. Sửa `src/components/layout/MainLayout.tsx`**

Thêm `ShiftStatusBanner` vào layout cho mobile:

```typescript
import { ShiftStatusBanner } from '@/components/staff/ShiftStatusBanner'
import { useUser } from '@/hooks/useUser'
import { isStaff } from '@/lib/userAccess'

const MainLayoutContent = () => {
  const { isMobile } = useBreakpoint()
  const { user } = useUser()
  const isStaffUser = isStaff(user)

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
        <MobileHeader />
        
        {/* Shift Status Banner - Only for staff */}
        {isStaffUser && <ShiftStatusBanner />}
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
          ...
        </main>
        <BottomNav />
      </div>
    )
  }
  // Desktop layout unchanged
}
```

---

### TÓM TẮT FILES CẦN TẠO/SỬA

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/components/staff/ShiftStatusBanner.tsx` | **Tạo mới** | Banner nhỏ gọn hiển thị khi chưa vào ca |
| `src/components/layout/MainLayout.tsx` | **Sửa** | Thêm ShiftStatusBanner vào mobile layout |
| `src/components/dashboard/MobileDashboard.tsx` | **Giữ nguyên** | Vẫn giữ ShiftCheckInCard đầy đủ trên Dashboard |

---

### KẾT QUẢ MONG ĐỢI

| Trạng thái | Hiển thị trên mọi trang (Banner) | Hiển thị trên Dashboard (Card) |
|------------|-----------------------------------|-------------------------------|
| Chưa vào ca | Banner vàng "Bạn chưa vào ca" + nút "Vào ca ngay" | Card đầy đủ với nút "Vào ca ngay" |
| Đã vào ca | Ẩn banner (hoặc indicator nhỏ) | Card hiển thị thời gian + nút "Kết thúc ca" |

---

### PHONG CÁCH UI

- Banner: màu vàng nhạt (`bg-amber-50`) để thu hút chú ý nhưng không quá đậm
- Chiều cao compact: `py-2`
- Button nhỏ gọn: `size="sm"`, `h-7`
- Ẩn ngay khi đã check-in để không chiếm diện tích

