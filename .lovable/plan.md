
## Kế hoạch: Cải thiện UI Room Check - Dễ thao tác, Dễ nhìn, Gọn gàng

### PHÂN TÍCH VẤN ĐỀ HIỆN TẠI

Sau khi kiểm tra code, tôi phát hiện các vấn đề sau:

#### 1. **CategoryItemRow.tsx - Quá phức tạp**
- Badge item_type hiển thị dưới tên item → Chiếm thêm không gian dọc
- Actions buttons (Giặt, Đổi, Thêm) nhỏ và khó bấm trên mobile
- Expanded form cho Lost/Damaged quá dài và phức tạp
- Status indicator circle quá nhỏ (w-5 h-5)

#### 2. **CategoryBasedItemsCheck.tsx - Tabs navigation chưa tối ưu**
- TabsList có `flex-wrap` → Trên mobile có thể bị wrap nhiều dòng
- Sticky header có quá nhiều thông tin nhỏ lẻ
- Progress summary (giặt, mất, hỏng) bị dính sát nhau, khó đọc

#### 3. **Thiếu nhất quán giữa item types**
- `ConsumableTab` sử dụng Card layout với thumbnail
- `CategoryItemRow` sử dụng compact row layout
- → Khi gộp theo Category, trải nghiệm UI không đồng nhất

#### 4. **Mobile UX issues**
- Không có touch feedback rõ ràng khi tap
- Actions buttons quá nhỏ cho ngón tay
- Expanded forms khó cuộn trong danh sách dài

---

### KẾ HOẠCH CẢI THIỆN

#### Phần 1: Đơn giản hóa CategoryItemRow

**Thay đổi:**

```text
TRƯỚC:
┌──────────────────────────────────────────┐
│ ○ Khăn tắm lớn              ×2           │
│   [Đồ vải]                  [Giặt][Đổi]  │
└──────────────────────────────────────────┘

SAU:
┌──────────────────────────────────────────────────┐
│ ● Khăn tắm lớn ×2    [Giặt] [Đổi] [Thêm] [Mất]  │
└──────────────────────────────────────────────────┘
```

- **Bỏ badge item_type** - Không cần vì đã phân theo Category
- **Một dòng duy nhất** - Tên + số lượng + actions ngang hàng
- **Status indicator lớn hơn** (w-6 h-6) với hiệu ứng rõ ràng
- **Touch target tối thiểu 44px** cho buttons

#### Phần 2: Tối ưu Tabs Navigation

**Thay đổi:**

```text
TRƯỚC:
┌───────────────────────────────────────────────────┐
│ [Tất cả 12] [Ẩm thực 3] [Phòng tắm 5] [Điện tử 4]│ ← Wrap nhiều dòng
├───────────────────────────────────────────────────┤

SAU:
┌───────────────────────────────────────────────────┐
│ ← [Ẩm thực] [Phòng tắm ✓] [Điện tử] [Đồ vải] →   │ ← Horizontal scroll
├───────────────────────────────────────────────────┤
│ 5/12 ━━━━━━━━━━○ 2 giặt • 1 mất                  │ ← Progress riêng
└───────────────────────────────────────────────────┘
```

- **Horizontal scroll** cho tabs thay vì wrap
- **Progress bar riêng biệt** bên dưới tabs
- **Hiển thị checkmark ✓** khi category hoàn thành
- **Badge số lượng nhỏ gọn** - Không cần badge "Tất cả"

#### Phần 3: Cải thiện Actions UI

**Cho Linen (Đồ vải):**

```text
┌──────────────────────────────────────────────────┐
│ ● Khăn tắm lớn ×2                                │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│   │ Giặt │ │ Đổi  │ │ Thêm │ │ Mất │               │
│   └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                  │
│   ▼ Số lượng: [-] 2 [+]  [Kho: 5]  [Xong]       │ ← Expanded inline
└──────────────────────────────────────────────────┘
```

- **Icon + Label** cho mỗi action button
- **Inline quantity selector** khi bấm action
- **Không cần confirm step** cho laundry/add/change

**Cho Consumable (Tiêu hao):**

```text
┌──────────────────────────────────────────────────┐
│ ● Dầu gội                   [Đủ] [Thiếu]        │
└──────────────────────────────────────────────────┘
```

- **2 buttons đơn giản**: Đủ hoặc Thiếu
- **Không cần quantity** - Mặc định thiếu = cần bổ sung

**Cho Equipment/Furniture:**

```text
┌──────────────────────────────────────────────────┐
│ ● TV 55 inch                [OK] [Hỏng] [Mất]   │
└──────────────────────────────────────────────────┘
```

- **3 buttons**: OK, Hỏng (cần form), Mất (cần form)

#### Phần 4: Compact Sticky Header

```text
┌───────────────────────────────────────────────────┐
│ ✓ 8/12 ━━━━━━━━━━━━━━━━━━━━━━━━●                 │
│ 2 giặt  •  1 mất  •  1 hỏng     [Tất cả OK]     │
└───────────────────────────────────────────────────┘
```

- **Progress bar lớn hơn** (h-2 thay vì h-1.5)
- **Summary dễ đọc hơn** với separator •
- **Button "Tất cả OK" nổi bật** khi còn items pending

---

### FILES CẦN SỬA

| File | Thay đổi |
|------|----------|
| `CategoryItemRow.tsx` | Bỏ item_type badge, tăng touch target, đơn giản hóa layout |
| `CategoryBasedItemsCheck.tsx` | Horizontal scroll tabs, tách progress header |
| `BulkActionsHeader.tsx` | Progress bar lớn hơn, summary rõ ràng hơn |
| `CategoryGroup.tsx` | Giảm padding header, tăng touch feedback |

---

### CHI TIẾT CẢI THIỆN CategoryItemRow

**Trước:**
```tsx
// Row chứa badge item_type - chiếm 2 dòng
<div className="flex items-center gap-2">
  <span className="text-sm truncate">{item.item_name}</span>
</div>
<Badge variant="outline" className="...">
  {ITEM_TYPE_LABELS[itemType]}
</Badge>
```

**Sau:**
```tsx
// Row đơn giản - 1 dòng duy nhất
<div className="flex items-center gap-2 flex-1 min-w-0">
  <span className="text-sm font-medium truncate">{item.item_name}</span>
  {standardQuantity > 1 && (
    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
      ×{standardQuantity}
    </span>
  )}
</div>
```

---

### CHI TIẾT CẢI THIỆN Tabs Navigation

**Trước:**
```tsx
<TabsList className="h-auto w-full flex-wrap justify-start gap-0.5 bg-transparent p-0">
```

**Sau:**
```tsx
<div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
  <TabsList className="inline-flex gap-1 bg-transparent p-0 min-w-max">
    {/* Tabs với horizontal scroll */}
  </TabsList>
</div>
```

---

### KẾT QUẢ MONG ĐỢI

| Tiêu chí | Trước | Sau |
|----------|-------|-----|
| Số dòng mỗi item | 2-3 dòng | 1 dòng |
| Touch target buttons | ~28px | 44px (chuẩn mobile) |
| Tabs overflow | Wrap nhiều dòng | Horizontal scroll |
| Item type badge | Hiển thị mỗi row | Ẩn (đã phân theo category) |
| Progress visibility | Nhỏ, khó thấy | Lớn, rõ ràng |
| Expanded form | Phức tạp | Inline đơn giản |

---

### NGUYÊN TẮC THIẾT KẾ ÁP DỤNG

1. **Tap-to-OK**: Chạm vào row = Mark OK (action phổ biến nhất)
2. **One-tap exceptions**: Bấm 1 lần để ghi nhận exception (Giặt, Thiếu, Hỏng)
3. **Inline editing**: Điều chỉnh số lượng ngay trong row, không cần modal
4. **Progressive disclosure**: Chỉ hiện form chi tiết khi cần (Lost/Damaged)
5. **Visual hierarchy**: 
   - ✓ Xanh = OK
   - 🔵 Xanh dương = Giặt  
   - 🟡 Vàng = Thiếu/Cảnh báo
   - 🔴 Đỏ = Mất
   - 🟠 Cam = Hỏng
