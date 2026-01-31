

## Kế hoạch: Thêm Yêu cầu Phân công Nhân viên khi Phiếu chưa có Người giao

### I. PHÂN TÍCH

**Vấn đề:**
- Phiếu giao hàng có thể được tạo mà không có nhân viên được phân công (`assigned_to = null`)
- Khi không có nhân viên, không thể giao hàng vì không biết giao cho ai
- Hiện tại không có cảnh báo/hướng dẫn khi gặp tình huống này

**Giải pháp:**
- Hiển thị cảnh báo khi phiếu chưa có người được phân công
- Cung cấp nút để mở dialog chỉnh sửa và phân công nhân viên
- Ẩn nút "Giao hàng cho nhân viên" khi chưa có người được phân công

### II. LOGIC KIỂM TRA

```text
Nếu order.assigned_to là null/rỗng VÀ status = 'pending':
  → Hiển thị cảnh báo "Phiếu chưa có nhân viên được phân công"
  → Hiển thị nút "Phân công ngay"
  → Ẩn nút "Giao hàng cho nhân viên"
```

### III. THAY ĐỔI UI

#### 3.1. Trong `DistributionOrderDetailPage.tsx`

**Thêm logic kiểm tra:**
```typescript
const hasAssignee = !!order.assigned_to
```

**Thêm cảnh báo (Desktop):**
```tsx
{/* Warning when no assignee */}
{order.status === 'pending' && !order.assigned_to && isWarehouseManager && (
  <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
    <CardContent className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <UserX className="h-5 w-5 text-amber-600" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Phiếu chưa có nhân viên được phân công. Vui lòng phân công trước khi giao hàng.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
        <UserPlus className="h-4 w-4 mr-2" />
        Phân công ngay
      </Button>
    </CardContent>
  </Card>
)}
```

**Thêm cảnh báo (Mobile):**
```tsx
{/* Warning when no assignee - Mobile */}
{order.status === 'pending' && !order.assigned_to && isWarehouseManager && (
  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
        <strong>Chưa phân công:</strong> Vui lòng chọn nhân viên giao hàng
      </p>
      <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
        Phân công
      </Button>
    </div>
  </div>
)}
```

#### 3.2. Trong `DeliveryStepWizard.tsx`

**Thêm prop mới:**
```typescript
interface DeliveryStepWizardProps {
  // ... existing props
  hasAssignee?: boolean  // THÊM MỚI
}
```

**Cập nhật logic hiển thị:**
```tsx
// Step 1: Pending - Need to assign staff first if not assigned
if (status === 'pending') {
  if (!hasAssignee && isWarehouseManager) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
          <UserX className="h-5 w-5" />
          <p className="text-sm font-medium">Chưa có nhân viên được phân công</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Vui lòng phân công nhân viên giao hàng trước khi tiếp tục.
        </p>
      </div>
    )
  }
  
  if (isWarehouseManager) {
    // ... existing handover logic
  }
}
```

#### 3.3. Trong `RouteDetailView.tsx`

**Truyền prop mới cho DeliveryStepWizard:**
```tsx
<DeliveryStepWizard
  // ... existing props
  hasAssignee={!!route.assigned_to}  // THÊM
  onHandoverBatch={
    route.status === 'pending' && isStorekeeper && firstPendingBatch && route.assigned_to
      ? handleHandoverFirstBatch
      : undefined
  }  // CHỈ CHO PHÉP NẾU CÓ ASSIGNEE
/>
```

### IV. FILES CẦN THAY ĐỔI

| File | Thay đổi |
|------|----------|
| `DistributionOrderDetailPage.tsx` | Thêm cảnh báo + nút phân công (Desktop & Mobile) |
| `DeliveryStepWizard.tsx` | Thêm prop `hasAssignee`, cập nhật UI khi chưa phân công |
| `RouteDetailView.tsx` | Truyền prop `hasAssignee`, chặn handover khi chưa phân công |

### V. UI/UX CHI TIẾT

**Desktop - Khi chưa phân công:**
```text
┌─────────────────────────────────────────────────────────────────────────┐
│ DIS-20251231-164831-5295                 [Chỉnh sửa] [Hủy] [In phiếu]  │
│ Chờ giao                                                                │
│ Tạo bởi Nguyễn Đức Phước • 31/12/2025                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ ⚠ Phiếu chưa có nhân viên được phân công.          [Phân công ngay]    │
│   Vui lòng phân công trước khi giao hàng.                               │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ ○ Chuẩn bị ── ○ Nhận hàng ── ○ Giao hàng ── ○ Hoàn thành        │  │
│ │                                                                    │  │
│ │ ⚠ Chưa có nhân viên được phân công                               │  │
│ │ Vui lòng phân công nhân viên giao hàng trước khi tiếp tục.        │  │
│ └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Desktop - Khi đã phân công:**
```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Bước tiếp theo: Ấn "Giao batch này" bên dưới để chuyển hàng            │
│ cho nhân viên được gán                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ ● Chuẩn bị ── ○ Nhận hàng ── ○ Giao hàng ── ○ Hoàn thành        │  │
│ │                                                                    │  │
│ │ Kiểm tra hàng trong kho. Sau đó giao cho nhân viên Nguyễn Văn A   │  │
│ │                                                                    │  │
│ │ [ Kiểm tra & Giao hàng cho nhân viên ]                            │  │
│ └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### VI. FLOW SAU KHI SỬA

```text
PHIẾU CHƯA CÓ NHÂN VIÊN
───────────────────────
1. Manager mở phiếu
2. Thấy cảnh báo "Chưa phân công"
3. Click "Phân công ngay"
4. EditDistributionDialog mở ra
5. Chọn nhân viên từ dropdown
6. Lưu → Phiếu được cập nhật
7. Nút "Giao hàng cho nhân viên" xuất hiện
8. Tiếp tục quy trình bình thường


PHIẾU ĐÃ CÓ NHÂN VIÊN
─────────────────────
1. Manager mở phiếu
2. Thấy hướng dẫn "Ấn Giao batch này..."
3. Click "Kiểm tra & Giao hàng cho nhân viên"
4. Tiếp tục quy trình bình thường
```

### VII. TÓM TẮT TRIỂN KHAI

1. **DistributionOrderDetailPage.tsx**: Thêm Card cảnh báo với nút "Phân công ngay" cho cả desktop và mobile
2. **DeliveryStepWizard.tsx**: Thêm prop `hasAssignee`, hiển thị trạng thái chưa phân công
3. **RouteDetailView.tsx**: Truyền `hasAssignee` và chặn handover khi chưa có assignee

