

## Kế hoạch thiết kế lại UI Kiểm tra Phòng

### Mục tiêu
- Giảm số bước thao tác từ 4 xuống 2-3
- Tối ưu cho mobile one-hand operation
- Ưu tiên hiển thị action phổ biến nhất (OK)
- Loại bỏ visual clutter, tăng mật độ thông tin

---

### Phase 1: Thiết kế lại danh sách phòng

**File:** `src/components/rooms/StaffRoomCheckView.tsx`

**Thay đổi:**

1. **Thay Card bằng List compact:**
```
| P101 | Tầng 1 | [Trống] | [Kiểm tra] |
| P102 | Tầng 1 | [Đang ở] | [---] |
```
- Mỗi row cao 48-56px thay vì Card 200px+
- Badge status nhỏ gọn với màu semantic
- Button "Kiểm tra" chỉ hiện khi phòng vacant/cleaning

2. **Filter strip dạng chips:**
- Thay Select dropdowns bằng horizontal scroll chips
- Quick filter: "Cần kiểm tra" (vacant + cleaning)

3. **Visual priority:**
- Phòng có pending checkout inspection -> Highlight màu cam
- Phòng chưa kiểm tra hôm nay -> Indicator dot

---

### Phase 2: Bỏ bước chọn loại kiểm tra khi context rõ ràng

**File:** `src/pages/rooms/RoomCheckPage.tsx`

**Thay đổi:**

1. **Auto-skip CheckTypeStep khi:**
- URL có `?type=checkout` -> Nhảy thẳng step 2
- URL có `?type=daily` từ morning routine -> Nhảy thẳng step 2
- Từ pending inspection notification -> Nhảy thẳng step 2

2. **Giữ CheckTypeStep chỉ khi:**
- Nhân viên tự chọn phòng bất kỳ
- Không có context từ URL

3. **UI mới cho CheckTypeStep (khi cần):**
- 4 buttons ngang thay vì 4 cards dọc
- Compact height: 80px thay vì 400px

---

### Phase 3: Thiết kế lại ItemsCheckStep - Core UX

**Files:** 
- `src/components/rooms/check-steps/ItemsCheckStep.tsx`
- `src/components/rooms/check-steps/item-type-tabs/*.tsx`

**Thay đổi chính:**

1. **Tabs -> Bottom navigation hoặc Segmented control:**
```
[Đồ vải (12)] [Tiêu hao (8)] [Thiết bị (5)]
```
- Fixed ở top, không cần cuộn để đổi tab
- Badge số lượng items trong mỗi tab

2. **Item list với Swipe Actions (mobile-first):**
```
┌─────────────────────────────────┐
│ Khăn tắm lớn        SL: 2   [OK]│  <- Swipe left để reveal: Giặt/Đổi/Mất
│ Ga giường           SL: 1   [OK]│
│ Gối                 SL: 4   [OK]│
└─────────────────────────────────┘
```

3. **Default action = OK:**
- Tap item row = Mark OK (không cần tap button)
- Swipe left = Reveal secondary actions (Giặt/Đổi/Mất)
- Long press = Quick quantity edit modal

4. **Bulk actions header:**
- "Tất cả OK" button prominent
- Reset all button

5. **Ẩn Category Groups cho Daily/Checkin:**
- Flat list cho loại check đơn giản
- Chỉ hiện Groups cho Checkout (cần kiểm kê chi tiết)

6. **Progress indicator tối giản:**
```
[████████░░] 24/30 ✓
```
- Một dòng compact thay vì sticky header lớn

---

### Phase 4: Thiết kế lại ReviewStep

**File:** `src/components/rooms/check-steps/ReviewStep.tsx`

**Thay đổi:**

1. **Collapse summary mặc định:**
- Chỉ hiện số liệu tổng: "3 giặt, 0 mất, 0 hỏng"
- Tap để expand chi tiết

2. **Star rating inline:**
- 5 stars ngang compact thay vì centered với description

3. **Photo upload tối giản:**
- 1 button "+ Thêm ảnh" thay vì dropzone lớn
- Thumbnails grid 4 cột

4. **Submit button fixed bottom:**
- Không cần cuộn để submit
- Progress indicator trên button: "Hoàn tất kiểm tra"

---

### Phase 5: Quick Check Mode mới

**Mục tiêu:** Kiểm tra phòng trong 10 giây cho trường hợp "Mọi thứ OK"

**Flow:**
1. Tap phòng -> Modal confirm: "Phòng OK? Điểm vệ sinh?"
2. Chọn star (3-4-5) -> Submit

**Implementation:**
- Thêm "Quick OK" button trên Room list
- Skip toàn bộ ItemsCheckStep
- Pre-fill: items_complete=true, items_missing=[], items_damaged=[]

---

### Phase 6: Responsive improvements

1. **Mobile (< 640px):**
- Full-width item rows
- Bottom sheet cho modals thay vì Dialog
- Larger tap targets (min 44px)

2. **Tablet/Desktop (≥ 768px):**
- Two-column layout: Room list left + Check form right
- Keyboard shortcuts: 1-5 cho star rating, Enter cho OK

---

### Files cần thay đổi

| STT | File | Thay đổi chính |
|-----|------|----------------|
| 1 | `StaffRoomCheckView.tsx` | List compact thay Card, filter chips |
| 2 | `RoomCheckPage.tsx` | Auto-skip step 1, Quick Check mode |
| 3 | `CheckTypeStep.tsx` | Horizontal buttons thay vertical cards |
| 4 | `ItemsCheckStep.tsx` | Swipe actions, bulk OK, simplified progress |
| 5 | `LinenTab.tsx` | Tap-to-OK, swipe-for-more pattern |
| 6 | `ConsumableTab.tsx` | Simplified actions cho Daily/Checkin |
| 7 | `EquipmentTab.tsx` | Same pattern |
| 8 | `FurnitureTab.tsx` | Same pattern |
| 9 | `ReviewStep.tsx` | Collapsed summary, fixed submit button |
| 10 | `CategoryGroup.tsx` | Auto-expand, remove accordion cho simple checks |

---

### Kết quả mong đợi

| Metric | Hiện tại | Sau redesign |
|--------|----------|--------------|
| Số tap để hoàn tất "All OK" | 15-20 | 3-5 |
| Thời gian check 1 phòng (OK) | 60-90s | 10-20s |
| Scroll distance | Nhiều | Minimal |
| Visual clutter | Cao | Thấp |
| Mobile usability | Trung bình | Cao |

---

### Thứ tự triển khai đề xuất

1. **Phase 3 trước** (ItemsCheckStep) - Impact lớn nhất
2. **Phase 5** (Quick Check Mode) - ROI cao
3. **Phase 1** (Room list) - Cải thiện navigation
4. **Phase 2** (Auto-skip) - Polish
5. **Phase 4** (ReviewStep) - Final touches
6. **Phase 6** (Responsive) - Enhancement

