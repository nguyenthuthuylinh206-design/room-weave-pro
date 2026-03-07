

## Fix: Logic tiếp theo sau "Kiểm tra & Giao hàng cho nhân viên"

### Van de hien tai

1. **`isCreatorSameAsAssignee` chua duoc truyen** tu `RouteDetailView` vao `DeliveryStepWizard` - wizard luon hien thi 4 buoc thay vi 3 buoc rut gon.

2. **Khi creator = assignee, van phai lam 2 buoc rieng**: 
   - Click "Kiểm tra & Giao hàng" → RPC `handover_batch` → status = `released`
   - Rồi phải click "Xác nhận đã nhận đủ hàng" → RPC `confirm_receive_order` → status = `in_progress`
   
   Điều này thừa vì chính mình giao cho mình.

3. **Khi creator != assignee**: Flow đúng rồi (released → assignee xác nhận → in_progress), không cần thay đổi.

### Giai phap

#### 1. Truyền `isCreatorSameAsAssignee` vào DeliveryStepWizard
**File**: `src/components/distribution/components/RouteDetailView.tsx`
- Thêm prop `isCreatorSameAsAssignee={user?.id === route?.created_by && user?.id === route?.assigned_to}`

#### 2. Auto-confirm khi creator = assignee
**File**: `src/components/distribution/components/RouteDetailView.tsx`
- Sau khi `handoverBatch` thành công + creator === assignee → tự động gọi `confirmReceive.mutateAsync()` luôn
- User chỉ cần 1 click thay vì 2 click
- Hiển thị toast "Đã kiểm tra kho & bắt đầu giao hàng"

#### 3. Cập nhật RPC `handover_batch` (tùy chọn - ưu tiên phương án code)
Thay vì sửa RPC (thêm tham số `p_auto_receive`), ta xử lý ở frontend bằng cách chain 2 mutation. Đơn giản hơn và không ảnh hưởng flow hiện tại.

### Thay doi cu the

**File `RouteDetailView.tsx`**:
```typescript
// 1. Tính isCreatorSameAsAssignee
const isCreatorSameAsAssignee = user?.id === route?.created_by && user?.id === route?.assigned_to

// 2. Truyền vào DeliveryStepWizard
<DeliveryStepWizard
  ...
  isCreatorSameAsAssignee={isCreatorSameAsAssignee}
/>

// 3. Sửa handleHandoverFirstBatch - auto confirm khi self-assign
const handleHandoverFirstBatch = useCallback(async () => {
  if (!firstPendingBatch) return
  const result = await handoverBatch.mutateAsync({ batchId: firstPendingBatch.id })
  
  if (!result.success && result.error === 'INSUFFICIENT_STOCK' && result.insufficient_items) {
    setInsufficientItems(result.insufficient_items)
    setAdjustDialogOpen(true)
    return
  }
  
  // Auto-confirm nếu creator = assignee
  if (result.success && isCreatorSameAsAssignee && route) {
    await confirmReceive.mutateAsync({ orderId: route.id })
    toast.success('Đã kiểm tra kho & bắt đầu giao hàng')
  }
}, [firstPendingBatch, handoverBatch, isCreatorSameAsAssignee, route, confirmReceive])
```

Tương tự cho `handleHandoverWithAdjustments` - sau khi adjust thành công + self-assign → auto confirm.

### Ket qua

- **Creator = Assignee**: 1 click "Kiểm tra kho & Bắt đầu giao hàng" → `pending` → `released` → `in_progress` (tự động)
- **Creator != Assignee**: Giữ nguyên flow 2 bước (handover → assignee confirm)
- Wizard hiển thị đúng 3 bước hoặc 4 bước tùy trường hợp

