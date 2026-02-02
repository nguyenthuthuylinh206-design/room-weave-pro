

## Kế hoạch: Hiển thị nút Kết thúc ca trên ShiftStatusBanner

### VẤN ĐỀ HIỆN TẠI

`ShiftStatusBanner` hiện tại **ẩn hoàn toàn** khi nhân viên đã vào ca (dòng 22: `if (isLoading || isOnShift) return null`). Điều này khiến nhân viên phải quay về Dashboard để kết thúc ca.

---

### GIẢI PHÁP

Cập nhật `ShiftStatusBanner` để hiển thị 2 trạng thái:

| Trạng thái | Màu nền | Nội dung | Nút |
|------------|---------|----------|-----|
| Chưa vào ca | Vàng (`amber`) | "Bạn chưa vào ca hôm nay" | Vào ca ngay |
| Đang trong ca | Xanh (`green`) | "Đang trong ca • HH:mm" | Kết thúc ca |

---

### THIẾT KẾ UI

**Khi chưa vào ca (hiện tại):**
```text
┌────────────────────────────────────────────────────┐
│ 🕐 Bạn chưa vào ca hôm nay    │  [Vào ca ngay →]  │  ← Nền vàng
└────────────────────────────────────────────────────┘
```

**Khi đã vào ca (mới):**
```text
┌────────────────────────────────────────────────────┐
│ ✓ Đang trong ca • 08:30 (2h)  │  [Kết thúc ca]    │  ← Nền xanh
└────────────────────────────────────────────────────┘
```

---

### CHI TIẾT IMPLEMENTATION

**Sửa file: `src/components/staff/ShiftStatusBanner.tsx`**

```typescript
import { Clock, CheckCircle, ChevronRight, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import {
  useMyStaffStatus,
  useShiftCheckIn,
  useShiftCheckOut,  // Thêm hook checkout
  isCurrentlyOnShift,
  formatShiftStartTime,
  calculateShiftDuration,
} from '@/hooks/useShiftManagement'

export function ShiftStatusBanner() {
  const { t } = useTranslation('common')
  const { data: myStatus, isLoading } = useMyStaffStatus()
  const { mutate: checkIn, isPending: isCheckingIn } = useShiftCheckIn()
  const { mutate: checkOut, isPending: isCheckingOut } = useShiftCheckOut()

  const isOnShift = isCurrentlyOnShift(myStatus)

  // Chỉ ẩn khi đang loading
  if (isLoading) return null

  // Đang trong ca - Banner màu xanh
  if (isOnShift) {
    const startTime = formatShiftStartTime(myStatus?.shift_start_at)
    const duration = calculateShiftDuration(myStatus?.shift_start_at)
    
    return (
      <div className="bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800 px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {t('shift.onShift', 'Đang trong ca')} • {startTime}
              {duration && ` (${duration})`}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900"
            onClick={() => checkOut()}
            disabled={isCheckingOut}
          >
            {isCheckingOut ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <LogOut className="h-3 w-3 mr-1" />
                {t('shift.checkOut', 'Kết thúc ca')}
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Chưa vào ca - Banner màu vàng (giữ nguyên code hiện tại)
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-b ...">
      ...
    </div>
  )
}
```

---

### TÓM TẮT THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `src/components/staff/ShiftStatusBanner.tsx` | Thêm trạng thái "Đang trong ca" với nút Kết thúc ca |

---

### KẾT QUẢ MONG ĐỢI

1. **Nhân viên chưa vào ca** → Banner vàng với nút "Vào ca ngay" (hiện tại)
2. **Nhân viên đã vào ca** → Banner xanh với thời gian bắt đầu + thời lượng + nút "Kết thúc ca"
3. **Sau khi kết thúc ca** → Banner chuyển lại màu vàng với nút "Vào ca ngay"
4. **Hiển thị trên TẤT CẢ trang mobile** → Không cần quay về Dashboard

