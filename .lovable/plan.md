

## Kế hoạch: Cập nhật Group Checkout để giống Check-out lẻ

### VẤN ĐỀ HIỆN TẠI

Trong **Group Checkout Dialog**, phần hiển thị trạng thái kiểm tra phòng quá đơn giản so với **Checkout lẻ** (`CheckoutInspectionSection`):

| Tính năng | Checkout lẻ | Group Checkout |
|-----------|-------------|----------------|
| Card UI với màu sắc theo status | ✅ Có (amber/blue/green) | ❌ Không |
| Timer đếm thời gian `in_progress` | ✅ Có | ❌ Không |
| Nút "Hủy yêu cầu" | ✅ Có | ❌ Không |
| Icon trạng thái rõ ràng | ✅ Có (AlertCircle, Loader2, CheckCircle2) | ❌ Chỉ có badge nhỏ |
| Thông tin thời gian chi tiết | ✅ Có (bắt đầu lúc, yêu cầu lúc) | ❌ Không |

---

### GIẢI PHÁP

Thay thế `AssignedStaffRow` bằng một component mới `InspectionStatusCard` có đầy đủ tính năng giống `CheckoutInspectionSection`:

**UI Mới cho Group Checkout:**

```text
┌─────────────────────────────────────────────────────────────────┐
│ ☐ P.P106                deluxe                    [750.000đ]   │
│    ─────────────────────────────────────────────────────────   │
│    ┌───────────────────────────────────────────────────────┐   │
│    │ ⏳ Đang chờ kiểm tra                                  │   │
│    │ 👤 NV: [Linh] 🟢  [📤] [📞]                           │   │
│    │ 🕐 Yêu cầu lúc: 10:30 04/02                           │   │
│    │ [Hủy yêu cầu]                                         │   │
│    └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Trạng thái đang kiểm tra:**

```text
┌───────────────────────────────────────────────────────┐
│ 🔄 Đang kiểm tra phòng                    [05:32]    │
│ 👤 NV: [Linh] 🟢  [📤] [📞]                          │
│ 🕐 Bắt đầu: 10:30 04/02                              │
│ [Hủy yêu cầu]                                        │
└───────────────────────────────────────────────────────┘
```

---

### THAY ĐỔI CẦN THỰC HIỆN

#### 1. Tạo component `InspectionStatusCard`

Thay thế `AssignedStaffRow` bằng component mới với đầy đủ tính năng:

```typescript
interface InspectionStatusCardProps {
  inspection: InspectionStatus
  staffList: OnShiftStaffMember[]
  onViewDetail: (staff: OnShiftStaffMember) => void
  onCancelInspection: (inspectionId: string) => Promise<void>
  isProcessing: boolean
}

function InspectionStatusCard({
  inspection,
  staffList,
  onViewDetail,
  onCancelInspection,
  isProcessing,
}: InspectionStatusCardProps) {
  // Timer state for in_progress
  const [elapsedTime, setElapsedTime] = useState('')
  
  // Timer effect (giống CheckoutInspectionSection)
  useEffect(() => {
    if (inspection.status !== 'in_progress' || !inspection.startedAt) {
      setElapsedTime('')
      return
    }
    // ... timer logic
  }, [inspection.status, inspection.startedAt])
  
  const staff = staffList.find(s => s.id === inspection.assignedTo)
  
  // Render card với màu sắc theo status
  if (inspection.status === 'in_progress') {
    return (
      <div className="p-2.5 border border-blue-500/50 rounded-lg bg-blue-50 dark:bg-blue-950/30">
        {/* Header với timer */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-medium">Đang kiểm tra</span>
          </div>
          {elapsedTime && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 rounded">
              <Clock className="h-3 w-3 text-blue-600" />
              <span className="font-mono text-xs">{elapsedTime}</span>
            </div>
          )}
        </div>
        
        {/* Staff info với status + contact buttons */}
        <StaffInfoLine staff={staff} onViewDetail={onViewDetail} />
        
        {/* Time info */}
        {inspection.startedAt && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1.5">
            <Clock className="h-3 w-3" />
            <span>Bắt đầu: {format(...)}</span>
          </div>
        )}
        
        {/* Actions */}
        <div className="mt-2 flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Hủy yêu cầu
          </Button>
        </div>
      </div>
    )
  }
  
  if (inspection.status === 'pending') {
    return (
      <div className="p-2.5 border border-amber-500/50 rounded-lg bg-amber-50 dark:bg-amber-950/30">
        {/* Header */}
        <div className="flex items-center gap-1.5 text-amber-700 mb-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Đang chờ kiểm tra</span>
        </div>
        
        {/* Staff info */}
        <StaffInfoLine staff={staff} onViewDetail={onViewDetail} />
        
        {/* Actions */}
        <div className="mt-2 flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Hủy yêu cầu
          </Button>
        </div>
      </div>
    )
  }
  
  if (inspection.status === 'completed') {
    return (
      <div className="p-2.5 border border-green-500/50 rounded-lg bg-green-50 dark:bg-green-950/30">
        <div className="flex items-center gap-1.5 text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-medium">Kiểm tra hoàn thành</span>
        </div>
      </div>
    )
  }
  
  return null
}
```

#### 2. Thêm function hủy yêu cầu kiểm tra

```typescript
const handleCancelInspection = async (inspectionId: string) => {
  try {
    await supabase
      .from('checkout_inspection_requests')
      .update({ status: 'cancelled' })
      .eq('id', inspectionId)
    
    toast.success('Đã hủy yêu cầu kiểm tra')
    refetchInspections()
  } catch (error) {
    toast.error('Lỗi hủy yêu cầu')
  }
}
```

#### 3. Cập nhật phần render trong room list

Thay thế:
```tsx
{/* Show assigned staff for pending/in_progress inspections */}
{isSelected && !isCheckedOut && inspection && ['pending', 'in_progress'].includes(inspection.status) && (
  <AssignedStaffRow ... />
)}
```

Bằng:
```tsx
{/* Show inspection status card */}
{isSelected && !isCheckedOut && inspection && ['pending', 'in_progress', 'completed'].includes(inspection.status) && (
  <InspectionStatusCard
    inspection={inspection}
    staffList={staffList}
    onViewDetail={(staff) => {
      setSelectedStaffForDetail(staff as StaffWithStatus)
      setStaffDetailOpen(true)
    }}
    onCancelInspection={handleCancelInspection}
    isProcessing={isProcessing}
  />
)}
```

---

### FILES CẦN THAY ĐỔI

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/components/bookings/GroupCheckoutDialog.tsx` | Thêm component `InspectionStatusCard` thay thế `AssignedStaffRow`, thêm timer, thêm nút hủy yêu cầu |

---

### KẾT QUẢ MONG ĐỢI

| Trạng thái | Trước | Sau |
|------------|-------|-----|
| **pending** | `NV kiểm tra: Linh 🟢 [📤][📞]` | Card màu amber với icon ⚠️, thời gian yêu cầu, nút hủy |
| **in_progress** | `NV kiểm tra: Linh 🟢 [📤][📞]` | Card màu blue với icon 🔄, **timer đếm thời gian**, nút hủy |
| **completed** | Chỉ badge "Đã KT" | Card màu green với icon ✅ |

**Tính năng mới:**
1. ✅ Card UI với màu sắc theo trạng thái (amber/blue/green)
2. ✅ Timer đếm thời gian realtime khi đang kiểm tra
3. ✅ Nút "Hủy yêu cầu" cho pending/in_progress
4. ✅ Hiển thị thời gian chi tiết (yêu cầu lúc / bắt đầu lúc)
5. ✅ Giữ nguyên tính năng: Click tên → StaffDetailSheet, nút Telegram/Phone

