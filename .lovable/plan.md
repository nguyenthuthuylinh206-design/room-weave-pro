

## Hiểu lại nghiệp vụ — phân biệt rõ Daily vs Checkout

User đã chỉ ra: **Daily check (kiểm tra hằng ngày khi khách đang ở)** và **Checkout (khách trả phòng)** có nghiệp vụ dọn dẹp KHÁC NHAU:

| Tình huống | Daily (khách đang ở) | Checkout (khách trả) |
|---|---|---|
| Phòng **Sạch** | ✅ Không cần dọn — chỉ ghi nhận | 🧹 Vẫn cần dọn nhẹ (thay ga, bổ sung) |
| Phòng **Bẩn nhẹ** | 🧹 Tạo task lau dọn | 🧹 Dọn bình thường |
| Phòng **Rất bẩn** | 🧹 Tạo task lau dọn ưu tiên | 🧹 Dọn kỹ |

**Logic chung**: Daily chỉ tạo task khi phòng KHÔNG sạch. Checkout LUÔN tạo task (vì phải thay ga sau mỗi khách).

→ Code hiện tại trong `useRoomChecks.ts` **đã đúng** cho daily (dòng 162-163: `if (roomCondition !== 'clean')`), nhưng **UI và CleaningRequestStep đang gây hiểu nhầm** vì dùng chung 1 component cho cả 2 luồng → cô buồng phòng tưởng daily cũng phải tạo task dọn dù phòng sạch.

## 3 vấn đề thực tế cần sửa

### 🔴 Vấn đề 1: `CleaningRequestStep` ép `needs_cleaning = true` cho mọi context
File `CleaningRequestStep.tsx` dòng 23-24: `useEffect` luôn `setValue('needs_cleaning', true)` — đúng cho checkout nhưng **sai cho daily**. Khi daily chọn "Sạch", `needs_cleaning` vẫn = true → gây nhầm lẫn (dù `useRoomChecks` chỉ kiểm tra `room_condition`).

### 🔴 Vấn đề 2: Summary text & Phòng → trạng thái sai cho daily
`CleaningRequestStep.tsx` dòng cuối ghi: *"Sau khi hoàn tất → Phòng chuyển sang **Đang chờ dọn**"* — đúng cho checkout, nhưng **sai cho daily** (khách đang ở, phòng không thể chuyển trạng thái `cleaning`). Daily chỉ tạo task riêng, phòng vẫn `occupied`.

### 🔴 Vấn đề 3: Submit dialog luôn hỏi "Tạo phiếu cho ca dọn phòng tiếp theo?" cho daily nếu phòng sạch
`RoomCheckPage.tsx` dòng 1101: tiêu đề dialog chỉ phân biệt `isCheckoutType`. Khi daily + phòng sạch → dialog vẫn hiện summary "Mức độ dọn: Dọn nhẹ (~15 phút)" → cô tưởng vẫn tạo task. Phải hiển thị rõ: **"Phòng sạch — không cần dọn lại, chỉ ghi nhận kiểm tra"**.

## Kế hoạch sửa

| # | File | Thay đổi |
|---|------|---------|
| 1 | `CleaningRequestStep.tsx` | Thêm prop `mode: 'checkout' \| 'daily'`. Trong `useEffect`:<br>• `checkout` → giữ nguyên (`needs_cleaning = true`, priority theo mức bẩn)<br>• `daily` → `needs_cleaning = (roomCondition !== 'clean')`, chỉ set priority khi cần dọn |
| 2 | `CleaningRequestStep.tsx` Summary text | Render text khác theo `mode` + `roomCondition`:<br>**Daily + Sạch**: "Phòng vẫn ổn — chỉ ghi nhận kiểm tra, không cần dọn lại"<br>**Daily + Bẩn nhẹ/Rất bẩn**: "Sẽ tạo phiếu lau dọn cho bộ phận buồng phòng. Phòng vẫn có khách → không đổi trạng thái phòng"<br>**Checkout**: giữ nguyên (luôn tạo phiếu, phòng → Đang chờ dọn) |
| 3 | `CleaningRequestStep.tsx` Label | Đổi label field theo mode:<br>**Daily**: "Tình trạng vệ sinh phòng hiện tại"<br>**Checkout**: "Tình trạng phòng khi khách trả" (giữ nguyên) |
| 4 | `RoomCheckPage.tsx` dòng 1414-1416 | Truyền `<CleaningRequestStep form={form} mode="daily" />` cho daily |
| 5 | `RoomCheckPage.tsx` dòng 1379, 1396, 1475 | Truyền `mode="checkout"` cho 3 chỗ checkout & replenish (replenish coi như checkout về mặt UI cleaning) |
| 6 | `RoomCheckPage.tsx` dialog dòng 1100-1163 | Tách 3 nhánh:<br>**A. Checkout**: giữ nguyên dialog hiện tại<br>**B. Daily + phòng SẠCH**: tiêu đề "Hoàn tất kiểm tra hằng ngày?", body ngắn "Phòng sạch sẽ, đồ dùng đầy đủ. Không cần dọn lại."<br>**C. Daily + phòng BẨN**: tiêu đề "Tạo phiếu lau dọn?", body hiển thị mức bẩn + "Bộ phận buồng phòng sẽ nhận task lau dọn. Khách vẫn ở phòng — phòng không đổi trạng thái." |
| 7 | `useRoomChecks.ts` dòng 161-195 | Code đã đúng (chỉ tạo task khi `roomCondition !== 'clean'`). **Giữ nguyên**, chỉ verify lại logic. |

## Quy tắc giữ nguyên
- Tiếng Việt thuần
- 1 component `CleaningRequestStep` tái dùng — chỉ thêm prop `mode` để phân biệt nghiệp vụ
- Daily check không bao giờ đổi trạng thái phòng (phòng vẫn `occupied`)
- Checkout luôn tạo task dọn (đã sửa ở plan trước, giữ nguyên)

## Kết quả mong đợi

- **Daily + Sạch** → Dialog ghi rõ "Phòng sạch, không cần dọn lại" → chỉ lưu room_check, KHÔNG tạo housekeeping_task
- **Daily + Bẩn** → Tạo task lau dọn cho bộ phận buồng phòng, phòng vẫn `occupied`
- **Checkout** → Luôn tạo task dọn (mọi mức bẩn), phòng → `cleaning`
- Cô buồng phòng đọc UI hiểu ngay nghiệp vụ — không còn nhầm "sạch mà vẫn tạo phiếu dọn"

