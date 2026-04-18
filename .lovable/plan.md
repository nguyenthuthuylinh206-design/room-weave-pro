

## Hiểu yêu cầu

User đơn giản hoá nghiệp vụ báo hỏng/mất/thiếu. Hiện tại khi đánh dấu "Hỏng" có popup hỏi:
- Mức độ: **Sửa chữa (50%)** / **Thay thế (100%)**
- **Chi phí ước tính**
- Ghi chú

→ Quá phức tạp cho cô buồng phòng. Nghiệp vụ thực tế:
- **Hỏng = Thay** (không cần biết chi phí, không phân biệt sửa/thay)
- **Thiếu = Bổ sung**
- **Mất = Bổ sung + Báo cáo**

Cô buồng phòng chỉ cần báo: cái gì hỏng/thiếu/mất → hệ thống tự sinh phiếu cho kho/bảo trì. Chi phí là việc của quản lý sau, không phải lúc check phòng.

## Vị trí code cần sửa

**File `CategoryItemRow.tsx` dòng 554-588**: Popup chọn loại hỏng (radio group `damage_type` + input `damage_cost` + textarea ghi chú).

Cần kiểm tra thêm:
- Nơi gọi popup hỏng cho linen/equipment/furniture
- Schema `damagedItemSchema` trong `rooms.schemas.ts` (có `damage_type`, `damage_cost`)
- Type `DamagedItem` trong `rooms.types.ts`
- Nơi xử lý downstream: `useRoomChecks.ts` → `createMaintenanceForDamagedItems` (có dùng `damage_cost` không)
- `ReviewStep.tsx` có hiển thị chi phí hỏng không

## Kế hoạch sửa

| # | File | Thay đổi |
|---|------|---------|
| 1 | `CategoryItemRow.tsx` dòng 554-588 | Bỏ block radio "Sửa chữa/Thay thế" + input "Chi phí". Giữ lại textarea "Ghi chú (tuỳ chọn)" để cô mô tả ngắn nếu cần. Khi submit hỏng: mặc định `damage_type = 'replacement_needed'`, `damage_cost = 0`. |
| 2 | `CategoryItemRow.tsx` (nút xác nhận hỏng) | Đổi label nút thành "Báo hỏng - cần thay" thay vì "Xác nhận". Bỏ validate chi phí. |
| 3 | `ItemsCheckStep.tsx` `handleMarkDamaged` | Truyền mặc định `damage_type: 'replacement_needed'`, `damage_cost: 0` nếu component con không gửi lên. |
| 4 | `ReviewStep.tsx` (nếu có hiển thị tổng chi phí hỏng) | Bỏ cột/dòng "Chi phí ước tính". Chỉ hiển thị: Tên đồ + Số lượng + "Cần thay". |
| 5 | `useRoomChecks.ts` `createMaintenanceForDamagedItems` | Bỏ phần ghép `damage_cost` vào title/description maintenance request. Title gọn: "Báo hỏng phòng X — cần thay [tên đồ]". |
| 6 | Tương tự cho **Mất (lost)** | Kiểm tra popup nhập `estimated_value` (dòng `handleEquipmentLost` trong `ItemsCheckStep.tsx`). Bỏ input chi phí. Lost = mặc định bổ sung + tạo báo cáo. |

## Quy tắc giữ nguyên
- Tiếng Việt thuần
- Schema DB không cần migration (cột `damage_cost`/`estimated_value` vẫn để default 0, không xoá để tránh phá dữ liệu cũ)
- Maintenance request vẫn được tạo tự động cho đồ hỏng (đã làm ở plan trước)
- Supplement request vẫn tự sinh cho thiếu/mất (đã làm)

## Việc cần verify trước khi sửa
- Đọc kỹ `CategoryItemRow.tsx` toàn bộ section damage popup để biết các state liên quan (`damageType`, `damageCost`, `damageNotes`) và xoá sạch.
- Kiểm tra `ItemsCheckStep.tsx` `handleEquipmentLost` có popup nhập `estimated_value` không → bỏ tương tự.
- Kiểm tra `ReviewStep.tsx` có summary chi phí hỏng/mất không → bỏ.

## Kết quả mong đợi
- Cô bấm "Hỏng" → chỉ hỏi (tuỳ chọn) ghi chú → xác nhận xong → tự sinh phiếu bảo trì "cần thay"
- Cô bấm "Mất" → chỉ hỏi số lượng → tự sinh phiếu bổ sung kho + báo cáo mất
- Không hỏi chi phí ở bất kỳ đâu trong luồng kiểm tra phòng
- Quy trình nhanh hơn, đúng vai trò: cô buồng phòng báo hiện trạng, không định giá

