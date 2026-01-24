

## Kế hoạch triển khai phần còn lại

### Phase 1: ConsumableTabBooking - Thêm checkType và filter actions

**File:** `src/components/rooms/check-steps/item-type-tabs/ConsumableTabBooking.tsx`

**Thay đổi:**
1. Thêm prop `checkType: CheckType` vào interface
2. Import `getCheckTypeConfig` từ `roomCheckConfig.ts`
3. Filter UI dựa trên `config.consumableActions`:
   - **Daily**: Chỉ hiện "OK" và "Hết" (không có counter phức tạp)
   - **Check-in**: Chỉ hiện "OK" và "Thiếu"
   - **Check-out**: Hiện đầy đủ "OK", "Đã dùng", "Mất" + counter
   - **Maintenance**: Chỉ hiện "OK" và "Thiếu"

**File:** `src/components/rooms/check-steps/ItemsCheckStep.tsx`

**Thay đổi:**
- Truyền `checkType` prop xuống `ConsumableTabBooking` (line 527-536)

---

### Phase 2: LinenTab - Thực hiện filter buttons

**File:** `src/components/rooms/check-steps/item-type-tabs/LinenTab.tsx`

**Thay đổi:**
1. Import `getCheckTypeConfig, ACTION_LABELS, ACTION_COLORS`
2. Trong render, chỉ hiển thị buttons có trong `config.linenActions`:

```typescript
const config = getCheckTypeConfig(checkType)
const allowedActions = config.linenActions

// Render buttons có điều kiện:
{allowedActions.includes('laundry') && (
  <Button onClick={() => onLinenStatusChange(item, 'laundry', 1)}>
    Giặt
  </Button>
)}
{allowedActions.includes('change') && (
  <Button onClick={() => onLinenStatusChange(item, 'change', 1)}>
    Đổi
  </Button>
)}
// ... tương tự cho add, lost, missing, damaged
```

---

### Phase 3: EquipmentTab và FurnitureTab - Kiểm tra và hoàn thiện filter

**Files:**
- `src/components/rooms/check-steps/item-type-tabs/EquipmentTab.tsx`
- `src/components/rooms/check-steps/item-type-tabs/FurnitureTab.tsx`

**Thay đổi:**
1. Đảm bảo đã import `getCheckTypeConfig`
2. Filter buttons dựa trên `config.equipmentActions` / `config.furnitureActions`:
   - **Daily/Check-in/Maintenance**: Ẩn nút "Mất", chỉ hiện "OK" và "Hỏng"
   - **Check-out**: Hiện đầy đủ "OK", "Mất", "Hỏng" + estimated value input

---

### Phase 4: ConsumableTab (non-booking) - Filter actions

**File:** `src/components/rooms/check-steps/item-type-tabs/ConsumableTab.tsx`

**Thay đổi:**
- Tương tự ConsumableTabBooking nhưng cho flow không có booking

---

### Phase 5: Check-in Block Dialog

**File:** `src/pages/rooms/RoomCheckPage.tsx` hoặc `ReviewStep.tsx`

**Thay đổi:**
1. Thêm state `showBlockDialog` 
2. Trong hàm submit/handleNext ở step cuối:
   - Kiểm tra nếu `checkType === 'checkin'` VÀ `config.blockOnDamaged === true`
   - VÀ có `itemsDamaged.length > 0` hoặc `itemsMissing.length > 0`
   - Thì hiển thị AlertDialog cảnh báo thay vì submit trực tiếp

```typescript
<AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Phòng chưa sẵn sàng</AlertDialogTitle>
      <AlertDialogDescription>
        Có {damagedCount} thiết bị hỏng và {missingCount} đồ dùng thiếu.
        Không nên cho khách check-in khi phòng chưa sẵn sàng.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Quay lại kiểm tra</AlertDialogCancel>
      <AlertDialogAction 
        variant="destructive"
        onClick={() => {/* proceed with submit */}}
      >
        Vẫn hoàn tất
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Tổng kết Files cần sửa

| STT | File | Thay đổi |
|-----|------|----------|
| 1 | `ConsumableTabBooking.tsx` | Thêm checkType prop, filter UI theo config |
| 2 | `ItemsCheckStep.tsx` | Truyền checkType cho ConsumableTabBooking |
| 3 | `LinenTab.tsx` | Filter buttons theo config.linenActions |
| 4 | `EquipmentTab.tsx` | Kiểm tra filter buttons theo config |
| 5 | `FurnitureTab.tsx` | Kiểm tra filter buttons theo config |
| 6 | `ConsumableTab.tsx` | Filter buttons theo config (nếu dùng) |
| 7 | `RoomCheckPage.tsx` | Thêm AlertDialog block cho check-in |

---

### Kết quả mong đợi sau khi hoàn thành

| Loại check | Đồ vải | Tiêu hao | Thiết bị |
|------------|--------|----------|----------|
| **Daily** | OK, Đổi | OK, Hết | OK, Hỏng |
| **Check-in** | OK, Thiếu, Thêm + Block warning | OK, Thiếu | OK, Hỏng + Block warning |
| **Check-out** | OK, Giặt, Đổi, Mất, Hỏng + Charges | OK, Đã dùng, Mất + Charges | OK, Mất, Hỏng + Charges |
| **Maintenance** | OK, Thiếu | OK, Thiếu | OK, Hỏng |

