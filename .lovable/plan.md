
## Kế hoạch: Khôi phục đầy đủ chức năng Room Check

### VẤN ĐỀ PHÁT HIỆN

Sau khi phân tích code, tôi thấy component mới `CategoryItemRow.tsx` **bị thiếu nhiều chức năng quan trọng** so với các tab cũ:

| Chức năng | ConsumableTab (cũ) | CategoryItemRow (mới) | Thiếu? |
|-----------|-------------------|----------------------|--------|
| **Thumbnail hình ảnh** | ✅ Có hiển thị | ❌ Không có | **THIẾU** |
| **Chọn số lượng tiêu hao** | ✅ Input + form expand | ❌ Chỉ gửi mặc định 1 | **THIẾU** |
| **Toggle "Cần bổ sung"** | ✅ Switch cho need_refill | ❌ Luôn = true | **THIẾU** |
| **Hiển thị standard_quantity** | ✅ "SL: 2" rõ ràng | ⚠️ Chỉ có badge nhỏ ×2 | Ít rõ |
| **Cảnh báo hết hàng kho** | ✅ Alert đỏ/vàng chi tiết | ⚠️ Chỉ text nhỏ | Đơn giản hóa |
| **Form "Đã dùng" mở rộng** | ✅ Với input số lượng + switch | ❌ Không có | **THIẾU** |

**Ở LinenTab:**

| Chức năng | LinenTab (cũ) | CategoryItemRow (mới) | Thiếu? |
|-----------|--------------|----------------------|--------|
| **Nhóm theo CategoryGroup** | ✅ Có | ⚠️ Có nhưng khác UI | OK |
| **Thao tác bulk "Tất cả OK"** | ✅ Có ở mỗi category | ✅ Có | OK |
| **Form điều chỉnh số lượng** | ✅ Khi expand row | ✅ Có | OK |

**Ở EquipmentTab:**

| Chức năng | EquipmentTab (cũ) | CategoryItemRow (mới) | Thiếu? |
|-----------|------------------|----------------------|--------|
| **Form báo mất chi tiết** | ✅ Có notes + giá | ✅ Có | OK |
| **Form báo hỏng** | ✅ RadioGroup + chi phí + notes | ✅ Có | OK |
| **Hiển thị info hỏng inline** | ✅ "Cần sửa • 500.000đ" | ❌ Không có | **THIẾU** |

### CÁC CHỨC NĂNG BỊ MẤT CẦN KHÔI PHỤC

1. **Consumable - Form "Đã dùng" hoàn chỉnh:**
   - Input số lượng đã dùng
   - Switch "Cần bổ sung" (need_refill)
   - Hiển thị stock warning chi tiết

2. **Thumbnail hình ảnh cho items (đặc biệt consumable)**

3. **Hiển thị thông tin hỏng/mất sau khi đánh dấu:**
   - Hiện chi tiết: "Cần sửa • 500.000đ" hoặc "Mất • 1.200.000đ"

4. **UI rõ ràng hơn cho consumable:**
   - Cần 2 trạng thái: "Đủ" vs "Thiếu/Đã dùng"
   - Khi thiếu → mở form chi tiết

### GIẢI PHÁP: KHÔI PHỤC UI THEO TỪNG LOẠI ITEM

Thay vì dùng 1 `CategoryItemRow` cho tất cả item types, cần **render UI khác nhau** cho mỗi loại:

```text
Category Tab "Phòng tắm"
├── Consumable items (dầu gội, sữa tắm)
│   └── Render giống ConsumableTab cũ với thumbnail + form đầy đủ
├── Linen items (khăn tắm, khăn mặt)  
│   └── Render với actions: Giặt, Đổi, Thêm, Mất + quantity adjuster
└── Equipment items (máy sấy tóc)
    └── Render với actions: Hỏng, Mất + form chi tiết
```

### FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `CategoryBasedItemsCheck.tsx` | Render UI khác nhau theo item_type |
| `CategoryItemRow.tsx` | Chia thành 3 variants hoặc cải thiện để hỗ trợ đầy đủ |
| **Mới**: Tái sử dụng logic từ `ConsumableTab.tsx` | Cho phần consumable trong category |

### CHI TIẾT THAY ĐỔI

#### 1. Thêm Consumable Form đầy đủ vào CategoryItemRow

```typescript
// Khi item là consumable và được bấm "Thiếu"
{expanded && itemType === 'consumable' && (
  <div className="px-3 pb-3 pt-1">
    <div className="p-3 bg-muted/50 rounded-lg space-y-3">
      {/* Thumbnail + Tên */}
      <div className="flex items-center gap-3">
        {item.item_thumbnail ? (
          <img src={item.item_thumbnail} className="w-10 h-10 rounded-lg" />
        ) : (
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <Droplets className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <span className="font-medium">{item.item_name}</span>
      </div>
      
      {/* Số lượng */}
      <div className="flex items-center gap-2">
        <Label>Số lượng thiếu:</Label>
        <Input type="number" value={qty} onChange={...} className="w-16" />
        <span className="text-xs text-muted-foreground">/ {item.standard_quantity}</span>
      </div>
      
      {/* Switch bổ sung */}
      <div className="flex items-center gap-2">
        <Switch checked={needRefill} onCheckedChange={...} />
        <Label>Cần bổ sung từ kho</Label>
      </div>
      
      {/* Stock warning */}
      {needRefill && availableStock === 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Hết hàng trong kho!</AlertDescription>
        </Alert>
      )}
      
      <Button onClick={handleConfirm}>Xác nhận</Button>
    </div>
  </div>
)}
```

#### 2. Hiển thị thông tin đã ghi nhận

```typescript
// Sau khi item đã được đánh dấu (consumed, damaged, lost)
{status === 'consumed' && (
  <div className="px-3 pb-2 text-xs text-muted-foreground flex items-center gap-2">
    <span>Thiếu {consumedInfo.quantity}</span>
    <span>•</span>
    <span>{consumedInfo.need_refill ? 'Cần bổ sung' : 'Không bổ sung'}</span>
    {consumedInfo.need_refill && availableStock <= 5 && (
      <Badge variant="outline" className="text-amber-600 border-amber-300">
        Kho: {availableStock}
      </Badge>
    )}
  </div>
)}

{status === 'damaged' && (
  <div className="px-3 pb-2 text-xs text-muted-foreground">
    {damagedInfo.damage_type === 'repairable' ? 'Cần sửa' : 'Cần thay'} • 
    {formatCurrency(damagedInfo.damage_cost)}
  </div>
)}
```

#### 3. Row layout đầy đủ hơn cho consumable

Thay vì compact row, consumable items sẽ có layout card nhỏ:

```typescript
// Trong CategoryBasedItemsCheck, render khác cho consumable
{item.item_type === 'consumable' ? (
  <ConsumableItemCard 
    item={item}
    status={status}
    consumedInfo={consumedInfo}
    onMarkOk={...}
    onMarkConsumed={...}
    onReset={...}
  />
) : (
  <CategoryItemRow ... />
)}
```

### KẾT QUẢ MONG ĐỢI

| Chức năng | Trước | Sau |
|-----------|-------|-----|
| Form "Đã dùng" consumable | ❌ Không có | ✅ Đầy đủ với số lượng + switch |
| Toggle need_refill | ❌ Luôn = true | ✅ User chọn được |
| Thumbnail hình ảnh | ❌ Không có | ✅ Hiển thị cho consumable |
| Stock warning chi tiết | ⚠️ Đơn giản | ✅ Alert đầy đủ với icon |
| Info sau đánh dấu | ❌ Không có | ✅ Hiện inline |
| Actions cho linen | ✅ OK | ✅ Giữ nguyên |
| Form hỏng/mất equipment | ✅ OK | ✅ Giữ nguyên |

### THỨ TỰ TRIỂN KHAI

1. **Cải thiện `CategoryItemRow.tsx`:**
   - Thêm expanded form cho consumable với input quantity + switch need_refill
   - Thêm hiển thị info sau đánh dấu (consumed/damaged)
   - Thêm thumbnail cho items

2. **Cập nhật `CategoryBasedItemsCheck.tsx`:**
   - Fetch thêm thumbnail từ items table
   - Truyền consumedInfo, damagedInfo vào CategoryItemRow để hiển thị

3. **Kiểm tra tích hợp:**
   - Đảm bảo form data được lưu đúng vào laundryItems, consumedItems, etc.
   - Test với các loại checkType khác nhau (checkout, checkin, daily)
