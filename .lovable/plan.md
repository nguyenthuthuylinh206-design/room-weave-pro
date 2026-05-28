## Vấn đề đang gặp & gốc rễ

1. **Kéo ngang ngày không di chuyển**
   - Header ngày (`div` ở dòng 594) và body (`div ref={parentRef}` dòng 632) là **2 anh em** trong cùng wrapper `overflow-hidden`. Body có thanh cuộn ngang riêng → khi cuộn body, header **không đồng bộ**, dẫn đến "ngày 28/05" cứ đứng yên dù bar bên dưới đã trượt.
   - Không có cơ chế **drag-to-pan** bằng chuột → lễ tân cảm giác "không kéo được".

2. **Text bị đè**
   - Cell ngày cao cố định `py-1.5` chỉ đủ 2 dòng (thứ + dd/MM). Khi có **lễ VN** thêm dòng "Mùng 1" / "Giỗ Tổ" → đè lên `dd/MM`.
   - KPI strip "Lấp đầy 0% · 30n 1%  ADR 1.921.000 ₫  RevPAR 18.295 ₫" wrap kém ở viewport hẹp, các con số dính nhau.
   - Cell rộng 96px nhưng "Đã trả phòng" + badge "WI" + tên dài → tràn ra ngoài bar.

3. **Chọn ngày không logic**
   - Nút ◀ ▶ nhảy theo cả window (vd 30 ngày) → bấm 1 lần là mất ngữ cảnh.
   - Ngày được chọn trong popover lịch trở thành cột **đầu tiên** thay vì cột **trung tâm** hoặc **được nhấn mạnh**, nên user khó định vị "hôm nay tôi vừa chọn".
   - Không có chỉ báo "đang xem ngày X" trên header.

---

## Kế hoạch sửa (chỉ frontend, không đụng schema/RPC)

### A. Đồng bộ cuộn ngang + drag-to-pan
- Gộp header và body **vào cùng 1 scroll container** (`parentRef`), với header dùng `sticky top-0 z-30` và cột "Phòng" `sticky left-0`. Khi user cuộn ngang body, header tự trượt theo.
- Wrapper ngoài đổi từ `overflow-hidden` → `overflow-hidden rounded-lg` (cho border), scroll thật nằm ở `parentRef`.
- Thêm **drag-to-pan**: nhấn giữ chuột trái trên vùng trống của header hoặc nền chart (không phải bar/booking/cell-button) rồi kéo ngang/dọc → `scrollLeft/scrollTop` di chuyển theo `pointermove`. Touch device dùng cuộn quán tính sẵn có.
- Cursor `grab` / `grabbing` để báo hiệu kéo được.

### B. Sửa text bị đè
- **Cell ngày header**: tăng padding tối thiểu (`min-h-[52px]` mặc định, `min-h-[64px]` khi có holiday), `gap-0.5` giữa các dòng, `truncate` cho holiday text.
- **KPI strip**: chia thành **2 nhóm rõ ràng** bằng dấu phân tách dọc và `flex-wrap` có gap chuẩn:
  - Nhóm vận hành: Đang ở · Đến · Đi · Lấp đầy hôm nay
  - Nhóm tài chính cửa sổ: Lấp đầy {N}n · ADR · RevPAR · Pickup
  - Dùng `tabular-nums` để số thẳng cột, không nhảy.
- **Bar booking**: rút ngắn badge nguồn xuống icon-only khi width < 80px; ẩn `·{guest_count}` khi width < 60px; thêm `min-w-0` trên `span truncate`.
- **Holiday tint** vẫn áp dụng nhưng tách hẳn dòng riêng dưới cùng để không đè `dd/MM`.

### C. UX chọn ngày
- Nút ◀ ▶ đổi sang **bước 7 ngày** (1 tuần), thêm cặp ◀◀ ▶▶ cho bước theo window. Bước 1 tuần là chuẩn lễ tân.
- Popover lịch: khi chọn ngày X → đặt `startDate = X - floor(days/4)` (X nằm gần đầu, lệch 1/4 window để vẫn thấy quá khứ gần). Cập nhật cả khi chọn nhanh "Hôm nay".
- Header thêm **cột ngày được chọn highlight** (`ring-1 ring-primary` + nền nhạt) phân biệt với "Hôm nay".
- Hiển thị label rõ: "Từ {dd/MM} → {dd/MM} • Tuần {wn}" thay cho "28/05 – 26/06" hiện tại.
- Phím tắt: `←` / `→` cuộn 7 ngày, `T` về hôm nay, `[` / `]` đổi window 7/14/30 (lưu prefs).

### D. Phụ trợ
- `min-w-0` trên các flex con đang bị tràn.
- Tự co `cellW` xuống còn 84px khi window = 30 ngày + viewport < 1200 để fit nhiều cột hơn mà không bị crop chữ.
- Đảm bảo now-line được render **bên trong** cùng scroll container để không lệch khi cuộn.

---

## File sẽ sửa

- `src/components/rooms/RoomTapeChart.tsx` — gộp header vào scroll, drag-to-pan, phím tắt, layout KPI, highlight ngày chọn, nút điều hướng tuần.
- `src/hooks/useTapeChartPrefs.ts` — thêm `selectedDate?: string` để nhớ ngày đang xem.
- `src/lib/app-version.ts` → `1.0.84` + entry `public/changelog.json`.

Không đụng RPC, không đụng schema, không đổi logic nghiệp vụ — đây thuần là sửa UI/UX cho lễ tân.

---

## Test sau khi build
1. Window 30 ngày: cuộn ngang body → header trượt theo, ngày luôn đúng cột với bar.
2. Nhấn giữ chuột trên vùng trống → kéo trái phải → chart pan mượt.
3. Bật/tắt holiday tint: ngày 30/04 không còn đè "30/04" lên "Giải phóng".
4. KPI ở viewport 981px (đang dùng): các nhóm không bị vỡ chữ, số thẳng cột.
5. Chọn 26/06 trong lịch → cột 26/06 nằm khoảng 1/4 đầu window, có ring highlight.
6. Bấm `→` 3 lần → tiến 3 tuần (21 ngày). Bấm `T` → trở về hôm nay.

Sẵn sàng triển khai khi bạn duyệt plan.