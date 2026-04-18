

## Mục tiêu: Logic kiểm tra phòng chuẩn — không bỏ sót case nào

Ba loại check phục vụ ba **mục đích nghiệp vụ khác nhau**, nên phải có **bộ action khác nhau**. Hiện tại logic đã gần đúng nhưng còn lẫn lộn — plan này chốt lại rõ ràng.

---

## A. Phân tích nghiệp vụ — ai làm, khi nào, mục đích gì

| Loại check | Người làm | Khi nào | Mục đích chính |
|---|---|---|---|
| **Daily** (hàng ngày) | Buồng phòng | Mỗi sáng / phòng trống | Phát hiện thiếu/hỏng SỚM để xử lý trước khi khách vào |
| **Checkin** (trước nhận phòng) | Lễ tân + buồng phòng | Trước khi khách đến | Đảm bảo phòng SẴN SÀNG — không thiếu, không hỏng |
| **Checkout** (sau trả phòng) | Buồng phòng | Khách vừa trả phòng | Tính phí khách (mất/hỏng) + báo dọn dẹp |

---

## B. Các trường hợp có thể xảy ra với từng loại đồ

### 1. Đồ vải (linen) — khăn, ga, vỏ gối...
| Tình huống thực tế | Daily | Checkin | Checkout |
|---|:---:|:---:|:---:|
| Còn nguyên, sạch | OK | OK | OK |
| Bẩn → cần giặt | — | — | **Giặt** |
| Cần thay mới (sờn/cũ) | — | — | **Đổi** (giặt + bù mới) |
| Thiếu so với chuẩn (NV trước quên trả) | **Thiếu** | **Thiếu** | — |
| Cần bổ sung thêm (theo yêu cầu khách) | — | **Thêm** | — |
| Hỏng/rách (do dùng thường) | **Hỏng** | **Hỏng** | **Hỏng** (tính phí khách) |
| Mất hẳn (khách lấy) | — | — | **Mất** (tính phí) |

### 2. Đồ tiêu hao (consumable) — bàn chải, dầu gội, nước...
| Tình huống | Daily | Checkin | Checkout |
|---|:---:|:---:|:---:|
| Còn đủ | OK | OK | OK |
| Hết → cần bổ sung | **Hết** | — | — |
| Thiếu (chưa được cấp) | **Thiếu** | **Thiếu** | — |
| Khách đã dùng (nước, đồ ăn minibar) | — | — | **Đã dùng** (tính phí nếu chargeable) |
| Mất nguyên hộp (hiếm — khách lấy) | — | — | **Mất** (tính phí) |

### 3. Thiết bị (equipment) — ấm đun, điều khiển, máy sấy...
| Tình huống | Daily | Checkin | Checkout |
|---|:---:|:---:|:---:|
| Hoạt động tốt | OK | OK | OK |
| Hỏng (không hoạt động) | **Hỏng** | **Hỏng** | **Hỏng** (xét tính phí khách) |
| Thiếu (NV trước mượn, chưa trả lại) | **Thiếu** | **Thiếu** | — |
| Mất hẳn (khách lấy) | — | — | **Mất** (tính phí) |

### 4. Nội thất (furniture) — bàn, ghế, đèn...
Giống equipment.

---

## C. Cấu hình chốt cho `roomCheckConfig.ts`

```ts
daily: {
  linenActions:      ['ok', 'missing', 'damaged'],         // OK / Thiếu / Hỏng
  consumableActions: ['ok', 'missing', 'empty'],           // OK / Thiếu / Hết
  equipmentActions:  ['ok', 'missing', 'damaged'],         // OK / Thiếu / Hỏng
  furnitureActions:  ['ok', 'missing', 'damaged'],
}

checkin: {
  linenActions:      ['ok', 'missing', 'add', 'damaged'],  // + Thêm + Hỏng (lễ tân biết)
  consumableActions: ['ok', 'missing'],                    // OK / Thiếu (chưa cần "hết" vì khách chưa vào)
  equipmentActions:  ['ok', 'missing', 'damaged'],
  furnitureActions:  ['ok', 'missing', 'damaged'],
}

checkout: {
  linenActions:      ['ok', 'laundry', 'change', 'damaged', 'lost'],  // Giặt / Đổi / Hỏng / Mất
  consumableActions: ['ok', 'consumed', 'lost'],                       // Đã dùng / Mất
  equipmentActions:  ['ok', 'damaged', 'lost'],                        // Hỏng / Mất (KHÔNG có "thiếu")
  furnitureActions:  ['ok', 'damaged', 'lost'],
}
```

### Phân biệt **Thiếu** vs **Mất** (cốt lõi)
- **Thiếu** (`missing`) = thiếu so với chuẩn, **chưa rõ ai làm mất** → báo cáo nội bộ + tự sinh phiếu bổ sung. Dùng ở Daily/Checkin (khi không có khách).
- **Mất** (`lost`) = khách đã dùng phòng và đồ biến mất → **tính phí khách**. Chỉ dùng ở Checkout.

→ Vì vậy **checkout không có nút "Thiếu"** — đã có khách, mất là phải tính phí.

### Phân biệt **Hết** vs **Đã dùng** (consumable)
- **Hết** (`empty`) = hết sạch, cần bổ sung. Dùng ở Daily.
- **Đã dùng** (`consumed`) = khách đã tiêu thụ → tính phí nếu là minibar/đồ ăn. Dùng ở Checkout.

---

## D. Thay đổi cần làm — chỉ 1 file

**File**: `src/lib/roomCheckConfig.ts`

| # | Thay đổi |
|---|---|
| 1 | `checkin.linenActions` thêm `'damaged'` → `['ok', 'missing', 'add', 'damaged']` (lễ tân cần biết khăn rách trước khi khách vào) |
| 2 | `checkout.equipmentActions` bỏ `'missing'` nếu có (giữ `['ok', 'damaged', 'lost']`) — đã đúng |
| 3 | `checkout.furnitureActions` giữ `['ok', 'damaged', 'lost']` — đã đúng |
| 4 | Cập nhật comment trong file để giải thích rõ "missing vs lost" cho lập trình viên sau này |
| 5 | Phase 1 (checkout) — phần báo cáo cho khách: chỉ `lost` + `damaged` (đã đúng), bỏ `missing` |
| 6 | Phase 2 (checkout) — phần báo bổ sung sau khi khách đi: `linen.add`, `consumable.empty` (đã đúng) |

**Không sửa**:
- `CategoryItemRow.tsx` — `getActionsForItemType` đã có `'missing'` cho cả 4 loại đồ → tự động render đúng khi config mở rộng.
- `CategoryBasedItemsCheck.tsx` — đã handle action `'missing'` đúng (route qua `onLinenStatusChange` → cộng vào `missingItems`).
- DB / Edge Function — không đụng.

---

## E. Sau khi sửa — kết quả mong đợi

**Phòng `997ffb2a` cô đang xem (Daily check):**
- Khăn tắm lớn (linen) → **OK / Thiếu / Hỏng** ✅
- Bàn chải (consumable) → **OK / Thiếu / Hết** ✅
- Ấm đun (equipment) → **OK / Thiếu / Hỏng** ✅

**Khi chuyển sang Checkin**: thêm "Thêm" (linen), giữ nguyên "Hỏng".

**Khi chuyển sang Checkout**: bỏ "Thiếu" toàn bộ (vì khách đã dùng phòng), thay bằng "Mất" (tính phí); linen có thêm "Giặt"/"Đổi"; consumable có "Đã dùng".

**Tiếng Việt thuần, không icon thừa, tuân thủ spec đã có.**

