
# Ma trận Báo cáo × Chức vụ × Bộ phận

> Tài liệu phân tích — chưa code. Sau khi bạn duyệt, tôi sẽ tách thành các plan build nhỏ (per role / per report).

---

## 1. Hiện trạng (11 báo cáo đã có)

| # | Báo cáo | Route | Dành cho hiện tại |
|---|---|---|---|
| 1 | Reports Dashboard | `/reports` | Owner / Hotel Manager |
| 2 | Revenue Analytics | `/reports/revenue` | Owner |
| 3 | Financial | `/reports/financial` | Owner / Kế toán |
| 4 | Rooms | `/reports/rooms` | Hotel Manager |
| 5 | Operations KPI | `/reports/operations` | Hotel Manager |
| 6 | Inventory | `/reports/inventory` | Trưởng kho |
| 7 | Stock Audit | `/reports/stock-audit` | Trưởng kho |
| 8 | Laundry | `/reports/laundry` | Trưởng giặt là |
| 9 | Maintenance | `/reports/maintenance` | Trưởng bảo trì |
| 10 | Outbound Goods | `/reports/outbound` | Trưởng kho |
| 11 | Damages | `/reports/damages` | Hotel Manager |

**Vấn đề:**
- Tất cả gom vào 1 hub, không lọc theo role → Trưởng bộ phận thấy báo cáo không liên quan.
- Thiếu báo cáo **Lễ tân (Front Office)**, **Buồng phòng (Housekeeping/QC theo người)**, **CRM khách hàng**, **Nhân sự / Chấm công**.
- Thiếu **Chain view** (so sánh đa khách sạn cho Owner).
- Không có báo cáo "của tôi" cho Staff (năng suất cá nhân).

---

## 2. Ma trận đề xuất (Báo cáo × Chức vụ)

Legend: ● = bắt buộc · ○ = tham khảo (read-only, giới hạn phạm vi) · — = không thấy

| Báo cáo | Owner / HQ | Hotel Mgr | Trưởng FO | Trưởng HK | Trưởng Kho | Trưởng Laundry | Trưởng MX | Staff |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Chain Overview** (mới) | ● | — | — | — | — | — | — | — |
| Hotel Dashboard | ● | ● | ○ | ○ | ○ | ○ | ○ | — |
| Revenue Analytics | ● | ● | ○ | — | — | — | — | — |
| Financial / P&L | ● | ● | — | — | — | — | — | — |
| **Front Office Report** (mới) | ● | ● | ● | — | — | — | — | — |
| **Guest CRM Report** (mới) | ● | ● | ● | — | — | — | — | — |
| Rooms Performance | ● | ● | ○ | ● | — | — | — | — |
| **Housekeeping Productivity** (mới) | ● | ● | — | ● | — | — | — | ○ "của tôi" |
| **QC Quality Report** (mới) | ● | ● | — | ● | — | — | — | — |
| Inventory | ● | ● | — | ○ | ● | — | — | — |
| Stock Audit | ● | ● | — | — | ● | — | — | — |
| Outbound Goods | ● | ● | — | ○ | ● | — | — | — |
| **Purchase Order Report** (mới) | ● | ● | — | — | ● | — | — | — |
| Laundry | ● | ● | — | ○ | — | ● | — | — |
| Maintenance | ● | ● | — | — | — | — | ● | — |
| Damages | ● | ● | — | ○ | ○ | ○ | ○ | — |
| Operations KPI | ● | ● | ○ | ○ | ○ | ○ | ○ | — |
| **Staff Performance** (mới) | ● | ● | ● | ● | ● | ● | ● | ○ "của tôi" |
| **Shift / Attendance** (mới) | ● | ● | ● | ● | ● | ● | ● | ○ "của tôi" |
| **My Tasks Report** (mới) | — | — | — | — | — | — | — | ● |
| Subscription / Billing | ● | — | — | — | — | — | — | — |

---

## 3. Báo cáo cần thêm mới (gap analysis)

### 3.1 Chain Overview (Owner đa khách sạn)
- KPI: Tổng revenue, ADR, RevPAR, Occupancy theo từng hotel — bảng ranking + sparkline.
- So sánh kỳ trước, drill-down vào từng hotel.
- Cảnh báo bất thường (revenue giảm >20% WoW, occupancy <40%…).

### 3.2 Front Office Report (Lễ tân)
- Booking funnel: tạo / huỷ / no-show / walk-in theo kênh (OTA / Direct / Phone).
- Check-in/out đúng giờ vs trễ giờ; thời gian xử lý trung bình.
- Công nợ chưa thu (unpaid debt) theo booking & theo khách.
- Deposit đã thu vs đã hoàn.
- Surcharge: early check-in / late checkout / extra services.

### 3.3 Guest CRM Report
- Top khách theo doanh số, tần suất lưu trú.
- Nguồn khách (OTA / Direct / Walk-in / Corporate).
- Phân loại VIP / Blacklist; sinh nhật trong tháng (upsell).
- Khách quay lại (repeat rate) — chỉ số trung thành.

### 3.4 Housekeeping Productivity
- Số phòng clean / người / ca; thời gian trung bình / phòng.
- Phân bổ task: assigned / completed / overdue.
- Heatmap giờ cao điểm.
- So sánh nhân viên (leaderboard).

### 3.5 QC Quality Report (mở rộng `/housekeeping/qc` hiện có)
- Pass rate, reject rate theo nhân viên / loại phòng / loại check (lean/quick/checkin/checkout).
- Top issue: damaged, missing, lost, consumed_chargeable.
- Thời gian từ submit → QC pass.

### 3.6 Purchase Order Report
- PO theo trạng thái, theo vendor.
- Lead time trung bình, on-time delivery rate.
- Chi phí mua hàng theo category / vendor / hotel.
- So sánh giá vendor (price benchmark).

### 3.7 Staff Performance & Shift / Attendance
- Số giờ làm thực tế vs ca đăng ký.
- Late/overtime/early-leave.
- Năng suất theo bộ phận (số task / giờ).
- Bảng lương ước tính (nếu có rate).

### 3.8 My Tasks Report (cá nhân — Staff)
- Tổng task đã làm tuần này / tháng này.
- Tỷ lệ on-time, pass QC.
- Phòng / khu vực phụ trách.
- Đơn giản, chỉ xem dữ liệu của chính mình (RLS).

---

## 4. Đề xuất kiến trúc Reports Hub mới

### 4.1 Reorganize `/reports` theo role-first navigation
```text
/reports
├── (Tab) Tổng quan                ← role hiện tại quyết định nội dung mặc định
├── (Section) Vận hành             ← Operations, Rooms, Front Office
├── (Section) Tài chính            ← Revenue, Financial, Subscription
├── (Section) Buồng phòng & QC     ← HK Productivity, QC Quality, Damages
├── (Section) Kho & Mua hàng       ← Inventory, Stock Audit, Outbound, PO
├── (Section) Giặt là & Bảo trì    ← Laundry, Maintenance
├── (Section) Nhân sự              ← Staff Performance, Shift/Attendance
└── (Section) Khách hàng           ← Guest CRM
```

- Mỗi section dùng `PermissionGate` để ẩn nếu role không có quyền.
- Owner thấy thêm tab **Chain** ở đầu khi `availableHotels > 1` hoặc đang ở **All Hotels mode**.
- Staff/Trưởng bộ phận thấy section "Của tôi" / "Bộ phận của tôi" được pin lên đầu.

### 4.2 Permission mapping (mở rộng matrix hiện tại)

Thêm action mới cho module `reports`:
| Action | Mô tả | Role |
|---|---|---|
| `view_chain` | Xem báo cáo đa hotel | super_admin, owner |
| `view_hotel` | Xem báo cáo toàn hotel | + hotel_manager |
| `view_department` | Xem báo cáo bộ phận của mình | + department_manager (theo `department` của user) |
| `view_self` | Xem báo cáo cá nhân | + staff |
| `export` | Xuất PDF/Excel | owner, hotel_manager (department_mgr tuỳ cấu hình) |

Tại RLS / RPC: filter thêm `department` từ `users.department` khi role = `department_manager`; filter `assigned_to = auth.uid()` khi role = `staff`.

### 4.3 Mobile-first cho Trưởng bộ phận
Trưởng HK / Laundry / MX / Kho thường dùng mobile → ưu tiên các `Mobile*ReportPage` đã có và bổ sung mobile cho 4 báo cáo mới.

---

## 5. Roadmap đề xuất (chia 4 sprint)

**Sprint A — Reports Hub Role-based (foundation)**
- Reorganize `/reports` theo section + permission filter.
- Thêm action permission `view_chain/hotel/department/self`.
- Quick wins: ẩn báo cáo không liên quan với từng role.

**Sprint B — Buồng phòng & QC (ưu tiên theo roadmap chính)**
- Housekeeping Productivity Report (mới).
- QC Quality Report (mở rộng `/housekeeping/qc`).
- "My Tasks Report" cho Staff HK.

**Sprint C — Lễ tân & CRM**
- Front Office Report (mới).
- Guest CRM Report (mới).
- Bổ sung Revenue drill-down theo kênh OTA.

**Sprint D — Chain view + Nhân sự**
- Chain Overview cho Owner (multi-hotel).
- Staff Performance + Shift/Attendance Report.
- Purchase Order Report.

---

## 6. Câu hỏi cần bạn chốt trước khi build

1. **Định nghĩa "department"** trong `users.department` đã đủ 4 giá trị (housekeeping / laundry / inventory / maintenance) chưa? Có cần thêm `front_office`?
2. **Lễ tân** hiện đang được map vào role nào (hotel_manager hay department_manager với department mới)? → ảnh hưởng permission Front Office Report.
3. **Staff có được xem báo cáo cá nhân không**, hay chỉ Trưởng bộ phận xem thay?
4. **Export quyền**: chỉ Owner/Hotel Manager, hay cho cả Trưởng bộ phận export báo cáo bộ phận của mình?
5. **Chain Overview**: ngoài Owner, có cho phép Hotel Manager được gán nhiều hotel xem dạng "mini-chain" không?

---

Sau khi bạn trả lời 5 câu trên + chọn sprint nào làm trước, tôi sẽ tạo plan build chi tiết (schema, RPC, hooks, UI, RLS, test) cho từng báo cáo mới.
