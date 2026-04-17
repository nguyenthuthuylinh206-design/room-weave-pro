

## Hiểu lại yêu cầu

User chỉnh nghiệp vụ thực tế: **Phòng "Sạch" KHÔNG có nghĩa là không cần dọn**. Sau mỗi lần khách trả phòng, dù phòng để lại sạch sẽ thì cô buồng phòng **VẪN PHẢI**:
- Thay ga giường, vỏ gối, khăn tắm (đồ vải bắt buộc thay sau mỗi khách)
- Bổ sung đồ tiêu hao (nước suối, trà, dầu gội...)
- Lau dọn cơ bản (bụi, bồn rửa)

Chỉ là **mức độ công việc nhẹ hơn** so với phòng bẩn/rất bẩn.

→ Vậy logic "Sạch → đánh dấu phòng trống luôn, không tạo phiếu dọn" là **SAI nghiệp vụ**.

## Điều chỉnh kế hoạch (sửa lại Vấn đề 3 từ kế hoạch trước)

### Logic đúng

**Mọi checkout đều TẠO PHIẾU DỌN cho ca sau** — không phụ thuộc mức bẩn. Mức bẩn chỉ là **thông tin tham khảo** giúp ca sau biết khối lượng việc:
- **Sạch** → ca sau dọn nhẹ (~15 phút): thay ga, bổ sung đồ
- **Bẩn nhẹ** → dọn bình thường (~30 phút): thay ga + lau dọn
- **Rất bẩn** → dọn kỹ (~45-60 phút): thay ga + lau sâu + có thể cần hóa chất

### Sửa 3 vấn đề còn lại

| # | File | Thay đổi |
|---|------|---------|
| 1 | `RoomCheckPage.tsx` dòng 1472-1481 | **Ẩn nút "Quay lại"** khi `currentStep === 4 && isCheckoutType && phase1Submitted` (đã chặn logic, ẩn UI cho gọn) |
| 2 | `RoomCheckPage.tsx` dòng 1112-1114 | **Đồng bộ label mức bẩn** trong dialog: `'clean' → 'Sạch'`, `'dirty' → 'Bẩn nhẹ'`, `'very_dirty' → 'Rất bẩn'` (khớp với CleaningRequestStep) |
| 3 | `CleaningRequestStep.tsx` | **Sửa lại logic khi chọn "Sạch"**: vẫn `needs_cleaning = true` (vì vẫn cần dọn nhẹ), priority = `low`. Sửa lại Summary text:<br>• Sạch → "Ca sau sẽ dọn nhẹ (thay ga, bổ sung đồ)"<br>• Bẩn nhẹ → "Ca sau sẽ dọn bình thường"<br>• Rất bẩn → "Ca sau sẽ dọn kỹ — quản lý nhận thông báo ưu tiên" |
| 4 | `RoomCheckPage.tsx` dialog title | **Giữ NGUYÊN** "Tạo phiếu cho ca dọn phòng tiếp theo?" cho mọi trường hợp (vì luôn tạo phiếu). Thêm dòng phụ hiển thị mức độ: "Mức độ: Dọn nhẹ / Dọn bình thường / Dọn kỹ" |
| 5 | `CleaningRequestStep.tsx` checkbox "Yêu cầu dọn dẹp ngay" | **Bỏ checkbox** — vì luôn cần dọn, không cần cho cô bật/tắt nữa. Mặc định luôn `needs_cleaning = true`. |

### Phòng chuyển trạng thái sau checkout

- Sạch / Bẩn nhẹ / Rất bẩn → **đều chuyển sang `cleaning`** (đang chờ dọn)
- Ca sau hoàn tất dọn → mới chuyển sang `available` (trống, sẵn sàng đón khách)

→ Sửa đoạn Summary trong CleaningRequestStep: bỏ trường hợp "Phòng chuyển sang Trống", thay bằng "Phòng chuyển sang Đang chờ dọn"

## Quy tắc giữ nguyên
- Tiếng Việt thuần
- 1 hành động/màn
- Không cho quay lui sau khi báo lễ tân
- **Mới**: Mọi checkout đều tạo phiếu dọn — mức bẩn chỉ quyết định độ ưu tiên & ước lượng thời gian

## Kết quả mong đợi

- Cô chọn "Sạch" → vẫn tạo phiếu cho ca sau (không bỏ sót việc thay ga)
- Dialog hiển thị mức độ dọn cần thiết → ca sau biết chuẩn bị bao nhiêu đồ
- Phòng luôn về trạng thái `cleaning` sau checkout → quy trình nhất quán
- Bỏ checkbox "Yêu cầu dọn dẹp ngay" — đỡ 1 thao tác thừa cho cô

