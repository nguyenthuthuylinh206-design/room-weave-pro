

## Vấn đề hiện tại

Trang `/rooms/:id/check` (DefaultOkItemsCheck + ReportIssueSheet) còn nhiều điểm chưa hợp lý:

### 1. Lạm dụng icon (vi phạm chuẩn minimalist)
- Vòng tròn có icon `Check` (✓) / `AlertCircle` (!) / `X` ở mỗi item
- Banner trên cùng có icon tròn lớn (Check / AlertCircle)
- Sheet "Báo sự cố" mỗi nút có emoji: 🧺 🔄 ➕ 🚫 🛠️ ⛔ 📦 📭
- Ô tìm kiếm có icon `Search`
- Nút bỏ báo cáo dùng icon `X`

### 2. Ngôn từ tác vụ không chuẩn / không thống nhất
- "OK" — viết tắt tiếng Anh, không đồng bộ với phần còn lại của app (đang dùng "Đạt", "Đầy đủ")
- "Mặc định OK · Chạm để báo sự cố" — kỹ thuật, không tự nhiên
- "Báo sự cố" — gay gắt; nên dùng "Ghi nhận tình trạng" / "Cập nhật"
- "sự cố" — chỉ đúng cho đồ hỏng/mất, không phù hợp với "đã giặt", "đã thay", "đã dùng"
- "Hỏng / Bẩn" gộp nhầm — bẩn ≠ hỏng (bẩn = cần giặt; hỏng = cần thay)
- Sheet: "Loại sự cố" → nên là "Tình trạng"
- "Cần bổ sung từ kho" + sub "Tự tạo phiếu yêu cầu bổ sung" — thừa, dài
- Banner: "Đã ghi nhận N sự cố" + "Các món khác mặc định OK" — văn nói, không formal
- Tag "Giặt / Thêm / Đổi / Mất / Hỏng / Thiếu / Đã dùng" — ngắn nhưng không đồng nhất với động từ ("Đã giặt / Đã thêm / Đã đổi / Mất / Hỏng / Thiếu / Đã dùng")

### 3. Thông tin trùng lặp
- Banner trên cùng + dòng tổng kết cuối ("X món OK · Y sự cố · Tổng Z") nói cùng việc
- Mỗi card OK lại có thêm hint "Báo sự cố" bên phải + dòng "Mặc định OK · Chạm để báo sự cố" bên dưới tên → 3 chỗ nói cùng 1 ý

### 4. Chỉ báo trạng thái dựa vào màu nền sặc sỡ
- Card hỏng: nền vàng; mất: nền đỏ; giặt: nền xanh — vi phạm chuẩn "chỉ dùng màu chữ semantic, không dùng màu nền cho status"

---

## Hướng sửa

### A. Bỏ toàn bộ icon trang trí
- **Vòng tròn trạng thái** → thay bằng **thanh dọc 3px bên trái card** (border-l-4) + chữ trạng thái. Card OK = không thanh; card có ghi nhận = thanh màu semantic (xanh/vàng/đỏ).
- **Banner trên cùng** → bỏ icon tròn, chỉ còn 1 dòng text gọn (`text-sm`) căn trái với border-l-4.
- **Search** → bỏ icon, đặt placeholder "Tìm theo tên hoặc mã..."
- **Nút reset (X)** → đổi thành text "Bỏ"
- **Sheet — bỏ toàn bộ emoji** trong các nút loại tình trạng. Chỉ giữ chữ.

### B. Chuẩn hóa ngôn từ

| Cũ | Mới |
|---|---|
| OK | Đạt |
| Mặc định OK · Chạm để báo sự cố | Đạt chuẩn |
| Báo sự cố | Cập nhật tình trạng |
| sự cố | mục cần xử lý |
| Loại sự cố | Tình trạng |
| Hỏng / Bẩn | tách thành **Hỏng** và **Bẩn (cần giặt)** |
| Đã ghi nhận N sự cố | N mục cần xử lý |
| Các món khác mặc định OK. Chạm vào sự cố để sửa, hoặc tiếp tục. | Các mục còn lại đạt chuẩn. Chạm để chỉnh sửa. |
| Cần bổ sung từ kho / Tự tạo phiếu yêu cầu bổ sung | Tạo phiếu bổ sung từ kho |
| Lưu sự cố | Lưu |

**Tag trạng thái** (đồng nhất theo cấu trúc "đã + động từ" cho hành động đã thực hiện, danh từ cho tình trạng):
- `laundry` → "Đã giặt" (giữ)
- `add` → "Đã thêm"
- `change` → "Đã thay"
- `lost` → "Mất" (giữ)
- `damaged` → "Hỏng" (giữ)
- `missing` → "Thiếu" (giữ)
- `consumed` → "Đã dùng" (giữ)
- `empty` → "Hết"

### C. Đơn giản hóa card item

Layout mới — 1 hàng duy nhất, không vòng tròn, không icon:

```text
┃ Khăn tắm lớn         ×2          [Báo cáo]   ← OK (border-l xám nhạt)
┃ 
┃ Ấm đun nước                    Hỏng 1/1  Bỏ  ← border-l-4 amber
```

- Bỏ dòng phụ "Mặc định OK · Chạm để báo sự cố" (đã thể hiện qua banner + nút bên phải)
- Bỏ nền màu sặc sỡ → chỉ giữ `border-l-4` semantic
- Chữ tag trạng thái dùng `text-{color}-600` (chuẩn dự án), không có badge nền

### D. Bỏ dòng tổng kết cuối

Banner trên đã có "N mục cần xử lý" — không cần lặp lại "X đạt · Y cần xử lý · Tổng Z".

### E. Sheet "Cập nhật tình trạng" — tinh gọn

- Bỏ emoji ở các nút loại tình trạng (chỉ chữ, dùng `border-2` + `text-{color}-600` khi chọn)
- Bỏ Alert icon (`AlertTriangle`) ở cảnh báo kho — chỉ dùng text màu cảnh báo
- Đổi label theo bảng B
- Tách "Bẩn (cần giặt)" thành lựa chọn riêng cho `linen` (map sang action `laundry`)

### F. Cập nhật memory

Cập nhật `mem://design/room-check-default-ok-ux-v1.md` để chốt: không icon, không emoji, dùng border-l-4 + màu chữ semantic, ngôn từ chuẩn theo bảng B.

---

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/rooms/check-steps/DefaultOkItemsCheck.tsx` | Bỏ import `Check/AlertCircle/X/Search/Badge`. Đổi banner thành 1 dòng text + border-l. Đổi card item thành layout hàng ngang, border-l-4 semantic, không vòng tròn icon. Đổi label theo bảng. Bỏ dòng tổng kết cuối. Nút reset thành text "Bỏ". |
| `src/components/rooms/check-steps/ReportIssueSheet.tsx` | Bỏ emoji trong `ISSUE_CATALOG`, bỏ icon `AlertTriangle/Plus/Minus`. Đổi label "Loại sự cố" → "Tình trạng", "Lưu sự cố" → "Lưu", "Cần bổ sung từ kho" gọn lại. Tách "Bẩn (cần giặt)" cho linen → map sang `laundry`. Stepper +/- dùng chữ "+" "−" thay icon. |
| `src/lib/roomCheckConfig.ts` | Cập nhật `ACTION_LABELS`: laundry → "Đã giặt", add → "Đã thêm", change → "Đã thay" (giữ ngắn gọn cho UI khác). |
| `.lovable/memory/design/room-check-default-ok-ux-v1.md` | Bổ sung quy chuẩn: không icon/emoji, border-l-4 thay vòng tròn, ngôn từ "Đạt / cần xử lý / cập nhật tình trạng" thay "OK / sự cố / báo sự cố". |

Không sửa hook, không migration, không thay đổi logic tính toán — chỉ tinh chỉnh UI và ngôn từ để đúng chuẩn Enterprise SaaS minimalist + thuật ngữ nghiệp vụ Việt.

