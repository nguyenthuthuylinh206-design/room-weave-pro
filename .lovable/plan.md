

## Popup chương trình hỗ trợ chuyển đổi số + Giới hạn phòng cho tenant mới

### Vấn đề
1. Tenant mới tạo tài khoản không có `subscription_plan_id` → `check_tenant_can_add` trả về NULL (unlimited) → tạo phòng không giới hạn
2. Chưa có thông báo về chương trình miễn phí 5 tháng

### Giải pháp

**1. Database: Tự động gán gói trial 5 tháng cho tenant mới**

Migration SQL:
- Tạo gói `free_trial` trong `subscription_plans` với giới hạn hợp lý (ví dụ: max 50 phòng, 2 khách sạn, 5 users)
- Cập nhật function `approve_tenant` để tự động gán `subscription_plan_id = free_trial`, `subscription_status = 'trial'`, `subscription_end_date = NOW() + 5 months`, `subscription_start_date = NOW()`
- Cập nhật các tenant hiện tại chưa có plan → gán trial 5 tháng từ ngày approved_at hoặc created_at

**2. Component: Popup thông báo chương trình**

Tạo `src/components/promotions/FreeTrialPopup.tsx`:
- AlertDialog hiển thị 1 lần khi user đăng nhập lần đầu (lưu flag vào localStorage `free_trial_popup_dismissed`)
- Nội dung:
  - Tiêu đề: "Chương trình hỗ trợ chuyển đổi số"
  - Miễn phí sử dụng phần mềm trong 5 tháng
  - Miễn phí setup, cài đặt phần mềm
  - Sau 5 tháng sẽ bắt đầu tính phí
  - Hotline/email hỗ trợ
- Nút: "Đã hiểu" để đóng
- Chỉ hiển thị cho tenant_owner và manager (không hiện cho staff)
- Chỉ hiện khi `subscription_status = 'trial'`

**3. Tích hợp vào MainLayout**

Thêm `<FreeTrialPopup />` vào `MainLayout.tsx` cạnh các prompt khác.

### Files

| File | Thay đổi |
|------|----------|
| Migration SQL | Tạo gói `free_trial`, cập nhật `approve_tenant`, gán plan cho tenant hiện tại |
| `src/components/promotions/FreeTrialPopup.tsx` | **Mới** — Popup thông báo chương trình |
| `src/components/layout/MainLayout.tsx` | Thêm `<FreeTrialPopup />` |

