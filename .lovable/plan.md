

## Kế hoạch: Mở rộng tính năng Theo dõi Ca làm việc

### TỔNG QUAN YÊU CẦU

Người dùng muốn mở rộng tab "Ca làm việc" với 3 tính năng mới:

1. **Theo dõi nhân viên đang trong ca** - Hiển thị realtime danh sách nhân viên đang làm việc
2. **Tính thời gian thực tế** - Hiển thị thời gian làm việc liên tục cập nhật
3. **Cài đặt ca làm việc + Nhắc nhở** - Cấu hình giờ làm chuẩn và gửi nhắc nhở khi quên kết thúc ca

---

### SƠ ĐỒ GIAO DIỆN MỚI

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Tab: CA LÀM VIỆC                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────┐ ┌────────────────────────┐│
│  │ 📌 ĐANG TRONG CA (3)                    │ │ ⚙️ CÀI ĐẶT CA          ││
│  ├─────────────────────────────────────────┤ ├────────────────────────┤│
│  │ 👤 Nguyễn Văn A                         │ │ Giờ bắt đầu: 08:00    ││
│  │    Vào ca: 08:00 • Đã làm: 2h 35p 🟢    │ │ Giờ kết thúc: 18:00   ││
│  │                                         │ │ Thời gian tối đa: 12h ││
│  │ 👤 Trần Thị B                           │ │                        ││
│  │    Vào ca: 07:45 • Đã làm: 2h 50p 🟢    │ │ Nhắc nhở sau: 10h     ││
│  │                                         │ │ [✓] Gửi push          ││
│  │ 👤 Lê Văn C                             │ │ [✓] Gửi Telegram      ││
│  │    Vào ca: 14:00 • Đã làm: 12h 30p 🔴   │ │                        ││
│  │    ⚠️ Quá giờ làm việc tiêu chuẩn       │ │ [Lưu cài đặt]         ││
│  └─────────────────────────────────────────┘ └────────────────────────┘│
│                                                                         │
│  ────────────── LỊCH SỬ CA ──────────────                               │
│  [Bộ lọc: Nhân viên ▼] [Từ ngày] [Đến ngày]                            │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ 45 ca    │ │ 320 giờ  │ │ 7.1 giờ  │ │ 12 NV    │                   │
│  │ Tổng ca  │ │ Tổng giờ │ │ TB/ca    │ │ Có đi ca │                   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                   │
│                                                                         │
│  Bảng lịch sử ca làm việc...                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### PHẦN 1: DANH SÁCH NHÂN VIÊN ĐANG TRONG CA (REALTIME)

#### Tính năng:
- Hiển thị tất cả nhân viên đang trong ca (`isCurrentlyOnShift = true`)
- Thời gian làm việc được tính realtime (tự động cập nhật mỗi phút)
- Màu sắc cảnh báo:
  - 🟢 Xanh: Thời gian làm việc bình thường
  - 🟠 Vàng: Sắp đến giới hạn (>8h mặc định)
  - 🔴 Đỏ: Quá giờ làm việc tối đa (>10h mặc định)

#### Thay đổi code:
| File | Thay đổi |
|------|----------|
| `useOnShiftStaffList.ts` | Thêm hook mới filter theo tenant (không cần hotelId) |
| `OnShiftStaffPanel.tsx` | Component hiển thị danh sách đang trong ca |
| `ShiftHistoryTab.tsx` | Tích hợp panel mới |

---

### PHẦN 2: TÍNH THỜI GIAN THỰC TẾ (LIVE TIMER)

#### Tính năng:
- Đếm thời gian làm việc từ `shift_start_at` đến hiện tại
- Cập nhật mỗi 60 giây
- Hiển thị định dạng: `Xh Yp` (ví dụ: 8h 30p)

#### Thay đổi code:
| File | Thay đổi |
|------|----------|
| `useShiftTimer.ts` | Hook mới với setInterval để tính thời gian live |
| `LiveShiftDuration.tsx` | Component hiển thị thời gian đếm ngược |

---

### PHẦN 3: CÀI ĐẶT CA LÀM VIỆC

#### Cấu hình lưu trong `tenants.settings`:
```json
{
  "shift_settings": {
    "default_start_time": "08:00",
    "default_end_time": "18:00",
    "max_shift_hours": 12,
    "warning_hours": 10,
    "reminder_enabled": true,
    "reminder_channels": ["push", "telegram"]
  }
}
```

#### Thay đổi code:
| File | Thay đổi |
|------|----------|
| `ShiftSettingsPanel.tsx` | Form cài đặt ca làm việc |
| `useShiftSettings.ts` | Hook đọc/ghi settings từ tenants.settings |

---

### PHẦN 4: NHẮC NHỞ KHI QUÊN KẾT THÚC CA

#### Logic:
1. Cron job chạy mỗi 30 phút kiểm tra nhân viên đang trong ca quá lâu
2. Nếu `(now - shift_start_at) > warning_hours` → Gửi nhắc nhở
3. Kênh thông báo: Push notification + Telegram

#### Thay đổi code:
| Loại | File | Mô tả |
|------|------|-------|
| Edge Function | `check-shift-overtime` | Kiểm tra và gửi nhắc nhở |
| Cron Job | SQL INSERT cron.schedule | Chạy mỗi 30 phút |
| Database | `shift_reminders` | Bảng lưu lịch sử nhắc nhở (tránh spam) |

---

### DATABASE CHANGES

#### Bảng mới: `shift_reminders`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | UUID | Primary key |
| tenant_id | UUID | FK → tenants |
| user_id | UUID | FK → users |
| shift_start_at | TIMESTAMPTZ | Thời điểm bắt đầu ca |
| reminded_at | TIMESTAMPTZ | Thời điểm gửi nhắc nhở |
| reminder_type | TEXT | 'warning' / 'overtime' |

---

### FILES CẦN TẠO/SỬA

| Loại | File | Mô tả |
|------|------|-------|
| **Hook** | `src/hooks/useOnShiftStaffListAll.ts` | Lấy tất cả NV đang trong ca (không filter hotel) |
| **Hook** | `src/hooks/useShiftTimer.ts` | Tính thời gian live |
| **Hook** | `src/hooks/useShiftSettings.ts` | Đọc/ghi cài đặt ca |
| **Component** | `src/components/staff/OnShiftStaffPanel.tsx` | Panel hiển thị NV đang trong ca |
| **Component** | `src/components/staff/LiveShiftDuration.tsx` | Component đếm giờ live |
| **Component** | `src/components/staff/ShiftSettingsPanel.tsx` | Form cài đặt |
| **Sửa** | `src/components/staff/ShiftHistoryTab.tsx` | Tích hợp 2 panel mới |
| **Migration** | `xxx_shift_reminders.sql` | Tạo bảng reminders |
| **Edge Function** | `supabase/functions/check-shift-overtime` | Cron job nhắc nhở |
| **Cron** | SQL INSERT | Lên lịch chạy mỗi 30 phút |

---

### LUỒNG HOẠT ĐỘNG

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                      SHIFT REMINDER FLOW                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Cron Job (mỗi 30 phút)                                                │
│   ┌────────────────┐                                                    │
│   │ pg_cron        │────▶ Edge Function: check-shift-overtime           │
│   └────────────────┘                                                    │
│                            │                                             │
│                            ▼                                             │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │ 1. Query staff_status WHERE isOnShift AND duration > 10h    │       │
│   │ 2. Check shift_reminders để tránh gửi trùng                 │       │
│   │ 3. Gửi Push + Telegram cho từng nhân viên                   │       │
│   │ 4. INSERT vào shift_reminders                               │       │
│   └─────────────────────────────────────────────────────────────┘       │
│                            │                                             │
│                            ▼                                             │
│   ┌────────────────┐  ┌────────────────┐                                │
│   │ Push Notif     │  │ Telegram Bot   │                                │
│   │ "Nhắc nhở:     │  │ "⚠️ Bạn đã    │                                │
│   │ Bạn đã làm     │  │ làm việc 10h,  │                                │
│   │ 10h, kết thúc  │  │ nhớ kết thúc   │                                │
│   │ ca nhé!"       │  │ ca!"           │                                │
│   └────────────────┘  └────────────────┘                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### KẾT QUẢ MONG ĐỢI

1. **Realtime tracking** - Quản lý thấy ngay ai đang trong ca, làm được bao lâu
2. **Live timer** - Thời gian cập nhật liên tục, không cần refresh
3. **Cảnh báo trực quan** - Màu sắc phân biệt tình trạng làm việc
4. **Nhắc nhở tự động** - Không để nhân viên quên kết thúc ca
5. **Cài đặt linh hoạt** - Mỗi tenant có thể tùy chỉnh theo nhu cầu

