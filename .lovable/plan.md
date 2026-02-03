

## Kế hoạch: Thêm Báo cáo Theo dõi Ca làm việc của Nhân viên

### TỔNG QUAN

Hiện tại hệ thống chỉ lưu trạng thái ca hiện tại (shift_start_at, shift_end_at) trong bảng `staff_status`, nhưng **không lưu lịch sử các ca làm việc**. Khi nhân viên kết thúc ca và bắt đầu ca mới, dữ liệu ca cũ bị ghi đè.

Tính năng mới sẽ:
- Lưu trữ lịch sử tất cả các ca làm việc
- Hiển thị báo cáo thống kê giờ làm theo ngày/tuần/tháng
- Cho phép quản lý xem chi tiết ca của từng nhân viên

---

### SƠ ĐỒ LUỒNG DỮ LIỆU

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          SHIFT TRACKING FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Nhân viên ấn "Vào ca"          Nhân viên ấn "Kết thúc ca"            │
│   ┌───────────────────┐          ┌───────────────────┐                 │
│   │ staff_status      │          │ staff_status      │                 │
│   │ shift_start_at=NOW│          │ shift_end_at=NOW  │                 │
│   └───────────────────┘          └─────────┬─────────┘                 │
│                                            │                            │
│                                            ▼                            │
│                                  ┌───────────────────┐                 │
│                                  │    TRIGGER        │                 │
│                                  │ log_shift_history │                 │
│                                  └─────────┬─────────┘                 │
│                                            │                            │
│                                            ▼                            │
│                                  ┌───────────────────┐                 │
│                                  │  shift_history    │                 │
│                                  │  (bảng mới)       │                 │
│                                  │  - user_id        │                 │
│                                  │  - start_at       │                 │
│                                  │  - end_at         │                 │
│                                  │  - duration_mins  │                 │
│                                  └───────────────────┘                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### PHẦN 1: DATABASE

#### 1.1 Tạo bảng `shift_history`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| user_id | UUID | FK → users |
| hotel_id | UUID | FK → hotels (nơi làm việc) |
| start_at | TIMESTAMPTZ | Thời gian bắt đầu ca |
| end_at | TIMESTAMPTZ | Thời gian kết thúc ca |
| duration_minutes | INTEGER | Số phút làm việc (computed) |
| notes | TEXT | Ghi chú (tùy chọn) |
| created_at | TIMESTAMPTZ | Auto |

#### 1.2 Tạo Trigger tự động log khi kết thúc ca

Khi `staff_status.shift_end_at` được cập nhật và > `shift_start_at`, trigger sẽ tự động INSERT vào `shift_history`.

#### 1.3 RLS Policies

- Quản lý/Owner xem được tất cả ca trong tenant
- Nhân viên chỉ xem được ca của chính mình

---

### PHẦN 2: UI - TAB "CA LÀM VIỆC" MỚI

#### 2.1 Thêm Tab vào StaffManagementPage

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Quản lý Nhân sự                                          12 nhân viên  │
├─────────────────────────────────────────────────────────────────────────┤
│  [Danh sách]  [Hoạt động]  [Công việc]  [CA LÀM VIỆC ←NEW]             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Bộ lọc: [Chọn nhân viên ▼] [Ngày từ] [Đến ngày] [Lọc]                │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ Thống kê tuần này                                               │  │
│   │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│   │ │ 45 ca    │ │ 320 giờ  │ │ 7.1 giờ  │ │ 12 NV    │            │  │
│   │ │ Tổng ca  │ │ Tổng giờ │ │ TB/ca    │ │ Có đi ca │            │  │
│   │ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ Nhân viên        │ Ngày       │ Vào ca  │ Ra ca   │ Thời gian  │  │
│   ├─────────────────────────────────────────────────────────────────┤  │
│   │ Nguyễn Văn A     │ 03/02/2026 │ 08:00   │ 17:30   │ 9h 30m     │  │
│   │ Trần Thị B       │ 03/02/2026 │ 07:45   │ 16:00   │ 8h 15m     │  │
│   │ Lê Văn C         │ 02/02/2026 │ 14:00   │ 22:00   │ 8h 00m     │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.2 Tính năng bao gồm:

| Tính năng | Mô tả |
|-----------|-------|
| **Bộ lọc** | Theo nhân viên, khoảng thời gian |
| **Thống kê tổng quan** | Tổng ca, tổng giờ, trung bình/ca, số NV đi ca |
| **Bảng chi tiết** | Danh sách từng ca với thông tin đầy đủ |
| **Export** | Xuất Excel (tùy chọn - phase 2) |

---

### PHẦN 3: CẬP NHẬT LOGIC CHECK-OUT

Khi nhân viên kết thúc ca, ngoài việc cập nhật `staff_status`, hệ thống cũng ghi vào `shift_history` (thông qua trigger).

---

### FILES CẦN TẠO/SỬA

| Loại | File | Mô tả |
|------|------|-------|
| **Migration** | `supabase/migrations/xxx_shift_history.sql` | Tạo bảng, trigger, RLS |
| **Hook** | `src/hooks/useShiftHistory.ts` | Query lịch sử ca |
| **Component** | `src/components/staff/ShiftHistoryTab.tsx` | Tab hiển thị báo cáo |
| **Component** | `src/components/staff/ShiftHistoryStats.tsx` | Cards thống kê |
| **Component** | `src/components/staff/ShiftHistoryTable.tsx` | Bảng chi tiết |
| **Sửa** | `src/pages/staff/StaffManagementPage.tsx` | Thêm tab mới |

---

### KẾT QUẢ MONG ĐỢI

1. **Lưu trữ đầy đủ** lịch sử tất cả các ca làm việc
2. **Thống kê trực quan** giờ làm của nhân viên theo ngày/tuần/tháng
3. **Báo cáo dễ đọc** với bộ lọc linh hoạt
4. **Tự động log** khi nhân viên kết thúc ca (không cần thao tác thủ công)

