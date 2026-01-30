
## Kế hoạch hoàn thiện tích hợp Supplement & Laundry Requests

### Tổng quan tình hình

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Route `/supplements` | ✅ Hoàn thành | App.tsx line 450-458 |
| SupplementsPage.tsx | ✅ Hoàn thành | Đã có full UI + filters + realtime |
| SupplementRequestSheet.tsx | ✅ Hoàn thành | Duyệt/Từ chối đã hoạt động |
| LaundryRequestsTab.tsx | ✅ Hoàn thành | Đã tích hợp + realtime |
| useSupplementRequests.ts | ✅ Hoàn thành | CRUD đầy đủ |
| useLaundryRequests.ts | ✅ Hoàn thành | CRUD + auto-add-to-batch |
| Sidebar navigation | ✅ Hoàn thành | Thêm link Supplements trong Inventory menu |
| Mobile navigation | ✅ Hoàn thành | Thêm link trong MobileNav + MorePage |
| Laundry Dashboard integration | ✅ Hoàn thành | Tabs: Batches / Requests |
| MobileLaundryDashboard | ✅ Hoàn thành | Quick action với badge |
| Realtime subscriptions | ✅ Hoàn thành | Auto-refresh khi có thay đổi |

---

### Hoàn thành tất cả giai đoạn

✅ **Giai đoạn 1: Navigation Integration**
- Sidebar.tsx: Thêm link `/supplements` vào menu Inventory
- Sidebar.tsx: Thêm link `/laundry?tab=requests` vào menu Laundry
- MobileNav.tsx: Thêm "Bổ sung đồ" link
- MorePage.tsx (desktop): Thêm "Bổ sung đồ" vào Management section  
- MorePage.tsx (mobile): Thêm "Bổ sung đồ" vào modules grid

✅ **Giai đoạn 2: Laundry Dashboard Integration**
- LaundryDashboardPage.tsx: Thêm Tabs component với 2 tabs (Batches / Requests)
- MobileLaundryDashboard.tsx: Thêm Quick Action "Đồ giặt từ phòng" với badge

✅ **Giai đoạn 3: Realtime Subscriptions**
- SupplementsPage.tsx: Thêm realtime listener cho `supplement_requests` table
- LaundryRequestsTab.tsx: Thêm realtime listener cho `laundry_requests` table

✅ **i18n Keys**
- navigation.json (vi): Thêm `laundryRequests`
- navigation.json (en): Thêm `laundryRequests`
