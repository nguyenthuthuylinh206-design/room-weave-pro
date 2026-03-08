

## Đánh giá /super-admin/reminders — Lỗi & Nâng cấp

### Lỗi nghiêm trọng (đang gây 400 error)
Query join `tenants(id, name, current_period_end)` nhưng cột thực tế là `subscription_current_period_end` → tất cả query có join tenants đều fail.

### Vấn đề phát hiện

| Mức độ | Vấn đề | File |
|---|---|---|
| **Critical** | Sai tên cột `current_period_end` → 400 error | `useRenewalReminders.ts` (2 chỗ) |
| **High** | Tab "Tự động hóa" hoàn toàn hardcoded (useState local, không lưu DB) | `ReminderAutomationRules.tsx` |
| **High** | Tab "Mẫu" hoàn toàn hardcoded (không lưu DB) | `ReminderTemplates.tsx` |
| **High** | Tab "Lịch" dùng sample data cứng, summary cứng | `ReminderScheduler.tsx` |
| **High** | Tab "Tổng quan" analytics dùng sample data cứng | `ReminderAnalytics.tsx` |
| **Medium** | UI dùng Card, text tiếng Anh, badge màu nền | Tất cả 5 file con |
| **Medium** | "Gửi nhắc nhở" chỉ update status, không gửi email thực | `useRenewalReminders.ts` |

### Kế hoạch fix

#### 1. Fix lỗi critical — sửa tên cột
- `useRenewalReminders.ts`: Đổi `current_period_end` → `subscription_end_date` (cột phù hợp nhất)

#### 2. Chuẩn hóa UI toàn bộ 5 sub-component
- Thay `Card` → `div border rounded-lg`
- Dịch text sang tiếng Việt
- Badge dùng semantic text color, bỏ bg fills
- Compact padding theo guideline

#### 3. Kết nối data thực cho Scheduler & Analytics
- `ReminderScheduler`: Query `renewal_reminders` theo ngày được chọn, tính summary từ DB thực
- `ReminderAnalytics`: Tính delivery rate, status distribution từ DB thực thay vì hardcoded chart

#### 4. Kết nối data thực cho Automation Rules & Templates
- Tạo 2 bảng mới: `reminder_automation_rules` và `reminder_email_templates` để lưu cấu hình
- Hook mới để CRUD automation rules và templates từ DB
- Rules và templates hiện tại trở thành seed data

#### 5. Gửi email thực qua Edge Function
- `useSendReminder`: Gọi edge function `send-notification-email` (đã có) thay vì chỉ update status

### File thay đổi
1. **`useRenewalReminders.ts`** — Fix column name, kết nối send email thực
2. **`RemindersTable.tsx`** — UI chuẩn hóa, dịch tiếng Việt
3. **`ReminderAutomationRules.tsx`** — UI + kết nối DB
4. **`ReminderTemplates.tsx`** — UI + kết nối DB
5. **`ReminderScheduler.tsx`** — UI + query data thực
6. **`ReminderAnalytics.tsx`** — UI + tính từ data thực
7. **`AdvancedReminderManagement.tsx`** — UI chuẩn hóa
8. **DB migration** — Tạo 2 bảng `reminder_automation_rules`, `reminder_email_templates`

