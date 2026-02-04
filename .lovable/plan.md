

## Kế hoạch: Sửa lỗi Group Checkout

### VẤN ĐỀ 1: Số "0" hiển thị trên tên phòng

**Nguyên nhân:** 
Đây là `damageCharge` (phí hư hỏng) từ dòng 769-772:
```tsx
{inspection?.damageCharge && inspection.damageCharge > 0 && (
  <span className="text-xs text-red-600 font-medium">
    +{formatVNCurrency(inspection.damageCharge)}
  </span>
)}
```

Nhưng `damageCharge` đang là `0` và JavaScript đánh giá `0 && ...` là falsy nên không render. Vấn đề thực sự là condition check `inspection?.damageCharge` - khi giá trị là 0, nó vẫn có thể render trong một số trường hợp do cách JavaScript xử lý falsy values.

**Giải pháp:** Cập nhật điều kiện rõ ràng hơn:
```tsx
{typeof inspection?.damageCharge === 'number' && inspection.damageCharge > 0 && (
  ...
)}
```

---

### VẤN ĐỀ 2: Không thể yêu cầu lại sau khi hủy

**Nguyên nhân:**
1. Khi hủy → database update status thành `'cancelled'`
2. Query lấy inspection request → trả về status `'cancelled'` (dòng 189)
3. Logic check `needsStaffAssignment` (dòng 739) chỉ check `'not_requested'`:
   ```tsx
   const needsStaffAssignment = isSelected && !isCheckedOut && 
     (!inspection || inspection.status === 'not_requested')
   ```
4. Status `'cancelled'` không match → không hiện dropdown chọn nhân viên

**Giải pháp:**
1. Thêm `'cancelled'` vào interface InspectionStatus (dòng 72)
2. Xử lý status `'cancelled'` trong query - coi như `'not_requested'` (dòng 189)
3. Cập nhật `needsStaffAssignment` để bao gồm `'cancelled'`:
   ```tsx
   const needsStaffAssignment = isSelected && !isCheckedOut && 
     (!inspection || inspection.status === 'not_requested' || inspection.status === 'cancelled')
   ```

---

### THAY ĐỔI CẦN THỰC HIỆN

#### File: `src/components/bookings/GroupCheckoutDialog.tsx`

**1. Cập nhật interface InspectionStatus (dòng 69-78):**
```typescript
interface InspectionStatus {
  bookingId: string
  roomId: string
  status: 'pending' | 'in_progress' | 'completed' | 'not_requested' | 'cancelled'
  damageCharge?: number
  inspectionId?: string
  startedAt?: string
  createdAt?: string
  assignedTo?: string
}
```

**2. Xử lý status cancelled trong query (dòng 186-195):**
```typescript
// Treat cancelled as not_requested (allow re-requesting)
const effectiveStatus = inspection.status === 'cancelled' 
  ? 'not_requested' 
  : inspection.status as 'pending' | 'in_progress' | 'completed'

return {
  bookingId: booking.id,
  roomId: booking.room_id,
  status: effectiveStatus,
  inspectionId: inspection.status !== 'cancelled' ? inspection.id : undefined,
  startedAt: inspection.started_at,
  createdAt: inspection.created_at,
  assignedTo: inspection.assigned_to,
  damageCharge,
}
```

**3. Sửa điều kiện hiển thị damageCharge (dòng 769):**
```tsx
{inspection?.damageCharge != null && inspection.damageCharge > 0 && (
  <span className="text-xs text-red-600 font-medium">
    +{formatVNCurrency(inspection.damageCharge)}
  </span>
)}
```

---

### KẾT QUẢ MONG ĐỢI

| Trước | Sau |
|-------|-----|
| Hiển thị số "0" trên tên phòng | Chỉ hiển thị khi có phí hư hỏng > 0 |
| Sau khi hủy → không yêu cầu lại được | Sau khi hủy → hiện lại dropdown chọn nhân viên để yêu cầu lại |

**Flow sau khi sửa:**
1. User chọn nhân viên → Gửi yêu cầu
2. Hiện InspectionStatusCard với trạng thái pending/in_progress
3. User bấm "Hủy yêu cầu" → Status chuyển về `'not_requested'` (logic)
4. Dropdown chọn nhân viên xuất hiện lại → User có thể gửi yêu cầu mới

