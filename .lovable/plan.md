

## Đánh giá trang /super-admin/ — Các điểm cần nâng cấp

Sau khi review toàn bộ codebase super-admin, hệ thống đã khá hoàn chỉnh với 8 module chính. Dưới đây là các vấn đề cần cải thiện:

---

### 1. UI không nhất quán (UI Consistency)

| Vấn đề | Nơi | Chi tiết |
|---|---|---|
| Dùng `Card` thay vì `border rounded-lg` | `RecentActivityFeed.tsx`, `CampaignsTable.tsx`, `TenantApprovalPage.tsx` | Vi phạm design guideline Enterprise SaaS Minimalist |
| Text tiếng Anh lẫn tiếng Việt | `RecentActivityFeed` ("Recent Activity", "No recent activity", "Loading...") | Cần dùng i18n translation |
| `TenantApprovalPage` style cũ | Font `text-3xl font-bold`, `container mx-auto py-8` | Không dùng `PageHeader`, padding quá lớn so với layout chung |
| Badge màu nền cho status | `RecentActivityFeed` dùng `bg-green-100`, `bg-blue-100`... | Guideline chỉ dùng màu chữ semantic, không dùng màu nền |

### 2. Tính năng placeholder / chưa hoạt động

| Tính năng | File | Vấn đề |
|---|---|---|
| Nút "Xuất báo cáo" (Export) | `AdvancedDashboard.tsx` | Chỉ có nút, chưa có logic export |
| Nút "Xuất dữ liệu" | `AdvancedTenantsManagement.tsx` | `console.log('Export tenants data')` |
| Nút "Thêm tenant" | `AdvancedTenantsManagement.tsx` | Không có onClick handler |
| Quick Action "Generate Report" | `QuickActions.tsx` | `console.log('Generate report')` |
| Export CSV trên Analytics | `AdvancedAnalytics.tsx` | Chỉ có nút UI, chưa có logic |
| MetricCard change "+12.5%" | `AdvancedDashboard.tsx` line 67 | Hardcoded, không tính từ data thực |

### 3. Thiếu tính năng quan trọng

- **Notification/Alert Center**: Không có hệ thống thông báo realtime cho super admin (tenant mới đăng ký, payment mới, subscription sắp hết...)
- **Tenant Approval chưa tích hợp vào layout**: `TenantApprovalPage` tồn tại nhưng không có trong sidebar navigation của SuperAdminLayout
- **Không có search global**: Không thể tìm kiếm nhanh tenant/campaign/promo code từ top bar
- **Thiếu Dark mode toggle**: Top bar trống bên phải, có thể thêm theme toggle

### 4. Đề xuất nâng cấp theo mức ưu tiên

**Ưu tiên cao (fix ngay):**
1. Sửa UI consistency — thay Card bằng border, dịch text sang tiếng Việt, chuẩn hóa TenantApprovalPage
2. Fix hardcoded "+12.5%" trên dashboard — tính từ data thực (revenue_this_month vs revenue_last_month)
3. Tích hợp Tenant Approval vào sidebar navigation

**Ưu tiên trung bình:**
4. Implement Export CSV/Excel cho Tenants table và Analytics (dùng `xlsx` đã cài sẵn)
5. Thêm Notification bell trên top bar — hiển thị pending approvals, expiring tenants, failed payments
6. Thêm Global Search trên top bar

**Ưu tiên thấp:**
7. Thêm Dark mode toggle trên top bar
8. Thêm Quick Action "Tạo tenant" thực sự hoạt động

---

### Kế hoạch thực hiện (nếu duyệt)

1. **Fix UI consistency**: Chuẩn hóa 3-4 file dùng Card → border, dịch i18n, sửa TenantApprovalPage dùng PageHeader
2. **Fix hardcoded metrics**: Tính % change từ `revenue_this_month` / `revenue_last_month`
3. **Tích hợp Tenant Approval**: Thêm route + sidebar link
4. **Implement Export**: Dùng `xlsx` package export tenants + analytics data
5. **Notification bell**: Component trên top bar, query pending approvals + expiring tenants

Bạn muốn thực hiện theo thứ tự ưu tiên nào, hoặc chọn nhóm cụ thể?

