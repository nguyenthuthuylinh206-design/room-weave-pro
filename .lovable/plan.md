

## Kế hoạch: Dọn dẹp mục Cài đặt - Loại bỏ các chức năng thừa

### PHÂN TÍCH HIỆN TRẠNG

Phần Settings hiện có **quá nhiều mục**, một số không hoạt động (chỉ là placeholder), trùng lặp, hoặc không phù hợp với workflow thực tế.

---

### CÁC MỤC CẦN LOẠI BỎ

| Trang | File | Lý do loại bỏ |
|-------|------|---------------|
| **SettingsPage.tsx** | `src/pages/settings/SettingsPage.tsx` | Trang cũ chỉ chứa giao diện demo (switch không hoạt động), đã bị thay thế bởi `GeneralSettingsPage` |
| **IntegrationsPage.tsx** | `src/pages/settings/IntegrationsPage.tsx` | Trang placeholder - chỉ hiển thị mock data, không có logic thực sự (chỉ các button "Kết nối" giả) |
| **SystemSecurityPage.tsx** | `src/pages/settings/SystemSecurityPage.tsx` | Trang phức tạp với settings không hoạt động (2FA, password policy, backup) - không có backend logic thực sự |
| **SystemTestPage.tsx** | `src/pages/settings/SystemTestPage.tsx` | Trang debug/test cho developer, không nên hiển thị cho user |

---

### CÁC MỤC TRONG SIDEBAR CẦN XÓA

**Desktop Sidebar (`Sidebar.tsx`):**
- `systemSecurity` → Xóa route `/settings/security`
- `integrations` → Xóa route `/settings/integrations`

**Mobile Settings (`MobileSettingsPage.tsx`):**
- `settings/email-templates` → Route không tồn tại
- `settings/localization` → Route không tồn tại  
- `settings/roles` → Route không tồn tại
- `settings/categories` → Đã có trong Items (trùng lặp)

---

### CÁC MỤC GIỮ LẠI (CÓ CHỨC NĂNG THỰC SỰ)

| Mục | Route | Lý do giữ |
|-----|-------|-----------|
| Cài đặt chung | `/settings/general` | Quản lý thông tin tenant, timezone, ngôn ngữ |
| Khách sạn | `/settings/hotels` | Quản lý danh sách hotels |
| Nhân viên | `/settings/users` | Quản lý users và permissions |
| Đổi mật khẩu | `/settings/change-password` | Chức năng bảo mật cơ bản |
| Gói dịch vụ | `/settings/subscription` | Quản lý subscription |
| Sử dụng | `/settings/usage` | Theo dõi quota |
| Thông báo | `/settings/notifications` | Push notifications, email settings |
| Telegram | `/settings/telegram` | Kết nối Telegram bot |
| Cấu hình nghiệp vụ | `/settings/business` | Settings cho inventory, laundry, rooms, maintenance |
| Phụ thu & thuế | `/settings/pricing-rules` | Quản lý pricing rules theo hotel |
| Quy trình tự động | `/settings/workflows` | Automation workflows |
| Kho hàng | `/settings/warehouses` | Quản lý warehouses |

---

### CHI TIẾT IMPLEMENTATION

#### 1. Xóa routes trong App.tsx

```typescript
// XÓA các routes:
// - settings/integrations
// - settings/security  
// - settings/system-test
```

#### 2. Cập nhật Sidebar.tsx

Xóa khỏi ownerNavigation và navigation:
```typescript
// XÓA:
{ titleKey: 'integrations', href: '/settings/integrations', icon: Plug },
{ titleKey: 'systemSecurity', href: '/settings/security', icon: Lock },
```

#### 3. Cập nhật MobileSettingsPage.tsx

Xóa các items không có route:
```typescript
// XÓA:
route: '/settings/email-templates'  // Route không tồn tại
route: '/settings/localization'     // Route không tồn tại
route: '/settings/roles'            // Route không tồn tại
route: '/settings/categories'       // Trùng với /items/categories
```

#### 4. Xóa các file không sử dụng

```text
- src/pages/settings/IntegrationsPage.tsx → Xóa
- src/pages/settings/SystemSecurityPage.tsx → Xóa
- src/pages/settings/SystemTestPage.tsx → Xóa
- src/pages/settings/SettingsPage.tsx → Xóa (đã redirect sang general)
```

#### 5. Cập nhật navigation.json

Xóa các key không còn sử dụng:
```json
// XÓA từ en và vi:
"integrations": "Integrations & API"
"systemSecurity": "System & Security"
```

---

### SIDEBAR SAU KHI DỌN DẸP

**Desktop (Owner):**
```text
Cài đặt
├── Cài đặt chung
├── Khách sạn
├── Nhân viên & Phân quyền
├── Đổi mật khẩu
├── Gói dịch vụ
├── Sử dụng
├── Thông báo
├── Telegram
├── Cấu hình nghiệp vụ
├── Phụ thu & thuế
└── Quy trình tự động
```

**Mobile:**
```text
Hồ sơ
├── Hồ sơ cá nhân

Quản lý
├── Khách sạn (Admin)
├── Nhân viên (Admin)

Hệ thống
├── Thông báo
├── Telegram
```

---

### TÓM TẮT FILES CẦN SỬA/XÓA

| Action | File |
|--------|------|
| Xóa | `src/pages/settings/IntegrationsPage.tsx` |
| Xóa | `src/pages/settings/SystemSecurityPage.tsx` |
| Xóa | `src/pages/settings/SystemTestPage.tsx` |
| Xóa | `src/pages/settings/SettingsPage.tsx` |
| Sửa | `src/App.tsx` - Xóa routes không dùng |
| Sửa | `src/components/layout/Sidebar.tsx` - Xóa menu items |
| Sửa | `src/components/settings/MobileSettingsPage.tsx` - Xóa items không có route |
| Sửa | `src/i18n/locales/vi/navigation.json` - Xóa keys thừa |
| Sửa | `src/i18n/locales/en/navigation.json` - Xóa keys thừa |

---

### KẾT QUẢ MONG ĐỢI

1. Settings gọn gàng hơn, chỉ còn các mục thực sự hoạt động
2. Không còn trang placeholder/demo
3. Mobile và Desktop settings đồng bộ
4. Loại bỏ ~4 files không sử dụng (~1500 lines code)

