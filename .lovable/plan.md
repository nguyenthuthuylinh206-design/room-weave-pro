
## Phân tích Quy trình Housekeeping: Vấn đề và Đề xuất Cải tiến

### I. TỔNG QUAN QUY TRÌNH HIỆN TẠI

```text
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│  CHECKOUT   │ → │   KIỂM TRA PHÒNG  │ → │    DỌN PHÒNG     │ → │  BỔ SUNG ĐỒ   │ → │   VACANT    │
│  (Booking)  │    │  (Room Check)     │    │   (Cleaning)     │    │ (Distribution)│    │  (Sẵn sàng) │
└─────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘    └─────────────┘
```

---

### II. VẤN ĐỀ PHÁT HIỆN

#### A. Checkout → Kiểm tra phòng

**Vấn đề 1: Phòng "check_out" không có đường dẫn rõ ràng**
- **Hiện trạng**: Sau `perform_checkout`, phòng chuyển sang status `check_out`
- **Tắc nghẽn**: Nhân viên phải tự vào `/rooms/{id}/check?type=checkout` để kiểm tra
- **Thiếu**: Không có nút "Kiểm tra ngay" trong `StaffRoomCheckView` cho phòng `check_out`
- **Tham khảo code**: `StaffRoomCheckView.tsx` chỉ xử lý `vacant` và `cleaning`, không có logic cho `check_out`

**Vấn đề 2: Kiểm tra checkout chưa link với Housekeeping Task**
- **Hiện trạng**: Manager tạo `checkout_inspection_request` nhưng hệ thống tạo thêm `housekeeping_task` song song
- **Tắc nghẽn**: Khi hoàn thành room check, code phải tìm và update CẢ HAI bảng
- **Phức tạp không cần thiết**: 2 bảng tracking cùng 1 việc

---

#### B. Kiểm tra phòng → Dọn phòng

**Vấn đề 3: Thiếu liên kết giữa CleaningRequest và Housekeeping Task**
- **Hiện trạng**: Khi checkout + `needs_cleaning=true`:
  - Room status → `cleaning`
  - Thông báo gửi cho Manager
  - Manager phải vào `RoomDetailPage` để xem `CleaningRequestBanner` và tạo task thủ công
- **Tắc nghẽn**: Không tự động tạo `housekeeping_task` loại `cleaning`
- **Tham khảo code**: `processCheckoutCheck()` chỉ gửi notification, không tạo task

**Vấn đề 4: Phòng "cleaning" không có task tương ứng**
- **Hiện trạng**: Phòng ở status `cleaning` nhưng chưa có task trong `housekeeping_tasks`
- **Hậu quả**: Nhân viên xem tab "Việc cần làm" (`StaffTasksTab`) không thấy phòng cần dọn
- **Mâu thuẫn**: 2 nguồn dữ liệu khác nhau (room status vs task list)

---

#### C. Dọn phòng → Bổ sung đồ

**Vấn đề 5: Không có workflow tự động bổ sung đồ**
- **Hiện trạng**: Sau checkout check, nếu có đồ `consumed` hoặc `lost`:
  - Tạo `inventory_transaction` để ghi nhận giảm stock
  - NHƯNG không tự động tạo yêu cầu bổ sung cho phòng đó
- **Thiếu**: Không tự động tạo `distribution_order` hoặc alert cho warehouse

**Vấn đề 6: Flow nhận đồ từ Distribution Order tách rời**
- **Hiện trạng**: 
  - Manager tạo phiếu giao hàng (distribution_order) thủ công
  - Nhân viên nhận đồ qua `DeliveryConfirmationModal`
- **Tắc nghẽn**: Không có link từ room check result → distribution order

---

#### D. Dọn phòng xong → Mở phòng

**Vấn đề 7: Flow "Hoàn thành dọn phòng" chưa tối ưu**
- **Hiện trạng**: `CleaningCompleteDialog` có 2 option:
  - "Mở phòng ngay" (skipCheck=true)
  - "Kiểm tra nhanh trước" (redirect to daily check)
- **Thiếu**: Không có logic để verify đồ đã đủ standard trước khi mở phòng
- **Rủi ro**: Có thể mở phòng khi đồ chưa đủ

**Vấn đề 8: Housekeeping task không tự complete khi mở phòng**
- **Hiện trạng**: `useMarkRoomReady()` chỉ update room status
- **Thiếu**: Không auto-complete `housekeeping_task` loại `cleaning` cho phòng đó

---

#### E. Session Management

**Vấn đề 9: Session cleanup có thể bỏ sót**
- **Hiện trạng**: `cleanup_stale_check_sessions` chạy mỗi 30 phút
- **Tắc nghẽn**: Session 40-50 phút có thể bị "lơ lửng"
- **Notification overlap**: Có thể gửi reminder nhiều lần nếu session duration > 50

---

#### F. Báo cáo

**Vấn đề 10: Thiếu báo cáo Housekeeping**
- **Hiện trạng**: `RoomsReportPage` có thống kê phòng, kiểm tra, doanh thu
- **Thiếu**: 
  - Thời gian dọn phòng trung bình
  - Hiệu suất nhân viên housekeeping (theo task, không chỉ room check)
  - Tỷ lệ phòng cần dọn vs dọn kịp thời

---

### III. ĐỀ XUẤT CẢI TIẾN

#### Nhóm A: Quick Fixes (Ít thay đổi)

| STT | Vấn đề | Giải pháp | Độ phức tạp |
|-----|--------|-----------|-------------|
| 1 | Phòng check_out không có nút KT | Thêm status `check_out` vào `StaffRoomCheckView` với nút "Kiểm tra checkout" | Thấp |
| 7 | Không verify đồ đủ standard | Thêm warning trong `CleaningCompleteDialog` nếu room có missing items | Thấp |
| 8 | Task không auto-complete | Thêm logic trong `useMarkRoomReady()` để complete task loại `cleaning` | Thấp |

---

#### Nhóm B: Medium Fixes (Cải thiện Flow)

| STT | Vấn đề | Giải pháp | Độ phức tạp |
|-----|--------|-----------|-------------|
| 3,4 | CleaningRequest không tạo task | Trong `processCheckoutCheck()`, nếu `needs_cleaning=true` → auto-create `housekeeping_task` loại `cleaning` | Trung bình |
| 5 | Không tự động bổ sung đồ | Sau checkout check, nếu có items consumed/lost → create "supplement request" hoặc alert | Trung bình |

---

#### Nhóm C: Major Refactor (Đơn giản hóa kiến trúc)

| STT | Vấn đề | Giải pháp | Độ phức tạp |
|-----|--------|-----------|-------------|
| 2 | 2 bảng tracking cùng 1 việc | Deprecated `checkout_inspection_requests`, chỉ dùng `housekeeping_tasks` với `task_type='checkout_inspection'` | Cao |
| 10 | Thiếu báo cáo Housekeeping | Tạo `HousekeepingReportPage` với metrics từ `housekeeping_tasks` | Trung bình |

---

### IV. FLOW ĐỀ XUẤT SAU CẢI TIẾN

```text
┌─────────────┐
│  CHECKOUT   │
│  (Booking)  │
└──────┬──────┘
       │ perform_checkout()
       ▼
┌──────────────────┐
│  Room: check_out │ ← NV thấy trong StaffRoomCheckView (mới)
└──────┬───────────┘
       │ Checkout Room Check (5 bước)
       ▼
┌──────────────────────────────────────────────┐
│           CHECKOUT ROOM CHECK                │
│  - Items consumed/lost → inventory_tx        │
│  - Chargeable items → notify managers        │
│  - needs_cleaning? → auto-create task (mới)  │
│  - Supplement needed? → create alert (mới)   │
└──────┬───────────────────────────────────────┘
       │
       ├── needs_cleaning = false ──────────────▶ Room: vacant ✓
       │
       ▼ needs_cleaning = true
┌─────────────────┐
│  Room: cleaning │
│  + Task: cleaning (auto-created - mới)       │
└──────┬──────────┘
       │ Staff claims task OR Manager assigns
       ▼
┌─────────────────┐
│  Staff dọn phòng │
│  + Nhận đồ bổ sung (nếu có Distribution)     │
└──────┬──────────┘
       │ Mark as Complete
       ▼
┌─────────────────────────────────────────────┐
│         CLEANING COMPLETE DIALOG             │
│  - Check missing items (mới) → warning       │
│  - Auto-complete housekeeping task (mới)     │
│  - Daily check (optional)                    │
└──────┬──────────────────────────────────────┘
       ▼
┌─────────────┐
│ Room: vacant │ ← Sẵn sàng nhận khách
└─────────────┘
```

---

### V. ƯU TIÊN TRIỂN KHAI

**Phase 1 - Quick Wins (1-2 ngày):**
1. Thêm status `check_out` vào `StaffRoomCheckView`
2. Auto-complete cleaning task trong `useMarkRoomReady()`
3. Warning missing items trong `CleaningCompleteDialog`

**Phase 2 - Core Improvements (3-5 ngày):**
4. Auto-create cleaning task khi checkout + needs_cleaning
5. Supplement alert sau checkout check

**Phase 3 - Architecture (Optional, 1 tuần):**
6. Migrate `checkout_inspection_requests` → `housekeeping_tasks`
7. Housekeeping Report Page
