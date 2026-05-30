## Vấn đề

Các trang đã build ở Day 1–8 đã được đăng ký route nhưng **chưa có link nào trên sidebar / menu** nên không thể vào được từ UI:

| Tính năng | Route đã có | Cách vào hiện tại |
|---|---|---|
| Bảng giá 4 trục (Pricing v2) | `/settings/pricing` | Chưa có link |
| Quy tắc mùa giá | `/settings/pricing/seasonal` | Chỉ có nút từ trang Bảng giá (vòng tròn) |
| Khai báo lưu trú BCA | `/legal/stay-registrations` | Chưa có link |
| Cấu hình BCA (tbltkbtt) | `/settings/legal/stay-registration` | Chỉ có nút từ trang Khai báo lưu trú (vòng tròn) |
| Pricing v2 trong đặt phòng | Nút trong Bước 2 wizard | OK — chỉ cần mở dialog "Đặt phòng" rồi qua Bước 2 |

## Kế hoạch

### A. Sidebar — thêm 3 entry mới trong `src/components/layout/Sidebar.tsx`

Trong nhóm **Cài đặt** (settings), group `'Nghiệp vụ'`:

```text
{ titleKey: 'pricingV2',      href: '/settings/pricing',          icon: DollarSign, minMode: 'standard', group: 'Nghiệp vụ' }
{ titleKey: 'seasonalRules',  href: '/settings/pricing/seasonal', icon: CalendarRange, minMode: 'standard', group: 'Nghiệp vụ' }
{ titleKey: 'bcaConfig',      href: '/settings/legal/stay-registration', icon: ShieldCheck, group: 'Pháp lý' }
```

Tạo group mới **'Pháp lý'** trong nhóm Cài đặt cho `bcaConfig`.

### B. Trang "Khai báo lưu trú BCA" — link top-level cho lễ tân

Thêm vào nhóm **Đặt phòng (bookings)** hoặc tạo section mới **Pháp lý** trong sidebar chính (cùng cấp với Reports), với 1 child:

```text
{ titleKey: 'stayRegistrations', href: '/legal/stay-registrations', icon: ClipboardList }
```

→ Lễ tân thấy được số khách báo cáo pending/failed mà không cần vào Cài đặt.

### C. i18n — bổ sung key vào `src/i18n/locales/{vi,en}/navigation.json`

| Key | VI | EN |
|---|---|---|
| `pricingV2` | Bảng giá 4 trục | Room Type Rates |
| `seasonalRules` | Quy tắc mùa giá | Seasonal Rules |
| `bcaConfig` | Cấu hình khai báo BCA | BCA Submission Config |
| `stayRegistrations` | Khai báo lưu trú | Stay Registrations |
| `legal` (group title nếu cần) | Pháp lý | Legal |

### D. Cross-link giữa các trang liên quan (đã có sẵn, giữ nguyên)

- `PricingV2Page` → nút "Quy tắc mùa giá →" (đã có)
- `StayRegistrationsPage` → nút "Cấu hình BCA" (đã có)

### E. Bump version

- `APP_VERSION` 1.1.1 → **1.1.2**
- Thêm entry vào `public/changelog.json`: "Sidebar: thêm lối vào cho Bảng giá 4 trục, Quy tắc mùa giá, Khai báo lưu trú BCA, Cấu hình BCA"

## Files sẽ sửa

- `src/components/layout/Sidebar.tsx` — thêm 3 entry + group "Pháp lý" + import 2 icon
- `src/i18n/locales/vi/navigation.json` + `src/i18n/locales/en/navigation.json` — 4–5 key mới
- `src/lib/app-version.ts` — 1.1.2
- `public/changelog.json` — entry release mới

## Không thay đổi

- Logic/business của các trang (đã chạy ổn)
- Route paths (giữ nguyên để không phá deep link đã chia sẻ)
- Permission rules (vẫn dùng `PermissionRoute module="settings"` / `"bookings"`)

## Hướng dẫn người dùng sau khi áp dụng

1. **Bảng giá 4 trục** → Cài đặt › Nghiệp vụ › **Bảng giá 4 trục**
2. **Quy tắc mùa giá** → Cài đặt › Nghiệp vụ › **Quy tắc mùa giá** (hoặc nút trên trang Bảng giá)
3. **Khai báo lưu trú BCA** → Đặt phòng › **Khai báo lưu trú** (sidebar)
4. **Cấu hình BCA** → Cài đặt › Pháp lý › **Cấu hình khai báo BCA**
5. **Pricing v2 trong đặt phòng**: mở dialog **Đặt phòng** → đến Bước 2 (Chọn phòng) → nút **"Áp dụng giá theo bảng"** ở góc phải.
