

## Giải pháp: Chế độ giao diện theo quy mô (Simple Mode / Homestay Mode)

### Vấn đề
Phần mềm hiện tại có rất nhiều module (Kho, Giặt là, Bảo trì, Nhà cung cấp, Đơn mua hàng, Báo cáo nâng cao...) phù hợp cho khách sạn lớn nhưng gây rối cho homestay nhỏ 10-20 phòng.

### Giải pháp
Thêm cấu hình **"Chế độ sử dụng"** ở cấp Tenant, cho phép chủ homestay chọn chế độ phù hợp. Sidebar, Dashboard và các route sẽ tự động ẩn/hiện theo chế độ đã chọn.

---

### 3 chế độ sử dụng

```text
┌─────────────┬──────────────────────────────────────────────┐
│ Chế độ      │ Modules hiển thị                             │
├─────────────┼──────────────────────────────────────────────┤
│ Homestay    │ Dashboard, Phòng, Đặt phòng, Khách, Hóa đơn │
│ (Đơn giản)  │ Cài đặt cơ bản                               │
├─────────────┼──────────────────────────────────────────────┤
│ Khách sạn   │ + Kho, Giặt là, Bảo trì                     │
│ (Tiêu chuẩn)│ + Báo cáo, Nhân viên                        │
├─────────────┼──────────────────────────────────────────────┤
│ Chuỗi KS    │ Tất cả modules                               │
│ (Nâng cao)  │ + NCC, Đơn mua, So sánh KS                  │
└─────────────┴──────────────────────────────────────────────┘
```

### Thay đổi cần thực hiện

**1. Database Migration**
- Thêm cột `usage_mode TEXT DEFAULT 'full'` vào bảng `tenants` (giá trị: `homestay`, `standard`, `full`)

**2. Hook `useTenant` — expose `usageMode`**
- Đọc `tenant.usage_mode` và export để các component sử dụng

**3. Sidebar — lọc menu theo `usageMode`**
- Mỗi NavItem thêm field `minMode: 'homestay' | 'standard' | 'full'`
- Sidebar filter navigation dựa trên usageMode của tenant
- Homestay mode: chỉ hiện Dashboard, Phòng (gồm Đặt phòng, Khách, Hóa đơn), Cài đặt cơ bản
- Standard mode: thêm Kho, Giặt là, Bảo trì, Báo cáo, Nhân viên
- Full mode: hiện tất cả

**4. Trang Cài đặt — UI chọn chế độ**
- Thêm section "Chế độ sử dụng" trong Settings General
- 3 card chọn chế độ với mô tả rõ ràng, icon minh họa
- Lưu vào `tenants.usage_mode`

**5. Dashboard tự động thích ứng**
- Homestay mode: Dashboard đơn giản hơn (chỉ phòng trống/đã đặt, doanh thu cơ bản)
- Ẩn các widget không liên quan (kho, giặt là, bảo trì)

**6. MobileNav & BottomNav — cũng lọc theo mode**

### Files cần tạo/sửa

| File | Thay đổi |
|------|----------|
| Migration | Thêm `usage_mode` vào `tenants` |
| `src/hooks/useTenant.ts` | Export `usageMode` |
| `src/components/layout/Sidebar.tsx` | Thêm `minMode` cho mỗi NavItem, filter theo mode |
| `src/components/layout/MobileSidebar.tsx` | Tương tự Sidebar |
| `src/components/layout/BottomNav.tsx` | Filter theo mode |
| `src/components/settings/UsageModeSelector.tsx` | **Mới** — UI chọn chế độ |
| `src/pages/settings/GeneralSettings.tsx` | Tích hợp UsageModeSelector |
| `src/components/dashboard/owner/OwnerDashboard.tsx` | Ẩn widget theo mode |

### Ưu điểm
- Chủ homestay vào lần đầu chọn "Homestay" → giao diện gọn gàng, dễ dùng
- Khi mở rộng quy mô → chuyển sang "Tiêu chuẩn" hoặc "Nâng cao" bất cứ lúc nào
- Không mất tính năng, chỉ ẩn/hiện — dữ liệu vẫn được bảo toàn

