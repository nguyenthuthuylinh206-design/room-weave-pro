
User muốn:
1. Phiên bản trong "Thông tin" ở MorePage tự động cập nhật theo mỗi lần deploy (hiện hardcode `v1.0.0`)
2. Bắt đầu với phiên bản `v1.0.1` ngay sau lần deploy này, kèm popup thông báo

## Phân tích hiện trạng

- `MorePage.tsx` line 158: hardcode `<span className="font-medium">v1.0.0</span>`
- `CacheBuster.tsx`: có `CURRENT_VERSION = '2026.04.17.2'` (format ngày, không phải semver)
- `PWAUpdatePrompt.tsx`: đã có popup hiển thị changelog với `version` từ hook `useChangelog`
- `useChangelog`: tồn tại — cần xem để biết changelog đến từ đâu (file JSON? hardcode?)

## Đề xuất

### 1. Tạo single source of truth cho version
Tạo file `src/lib/app-version.ts`:
```ts
export const APP_VERSION = '1.0.1';
export const APP_VERSION_DATE = '2026-04-17';
```

### 2. Dùng version ở 3 nơi
- **MorePage**: import `APP_VERSION` thay cho hardcode `v1.0.0`
- **CacheBuster**: dùng `APP_VERSION` làm `CURRENT_VERSION` (thay format ngày bằng semver — đơn giản hơn cho user)
- **PWAUpdatePrompt**: changelog hiện tại đã hiển thị version từ `useChangelog` — kiểm tra & đảm bảo entry `1.0.1` tồn tại

### 3. Cập nhật changelog cho v1.0.1
Cần xem `useChangelog` lấy data từ đâu để thêm entry mới với:
- version: `1.0.1`
- title: "Cập nhật mượt mà"
- changes: liệt kê những fix gần đây (PWA cache busting, realtime nhân viên, touch standard, tắt PullToRefresh /inventory)

### 4. Quy trình cho lần sau
Mỗi lần deploy cần update:
- `src/lib/app-version.ts` — bump số (1.0.1 → 1.0.2)
- Thêm entry mới vào changelog
→ MorePage tự đổi, CacheBuster tự wipe cache, PWAUpdatePrompt tự hiện popup mới

## Files thay đổi

| File | Thao tác |
|------|---------|
| `src/lib/app-version.ts` | **Mới** — export `APP_VERSION = '1.0.1'` |
| `src/pages/mobile/MorePage.tsx` | Import `APP_VERSION`, thay `v1.0.0` |
| `src/components/pwa/CacheBuster.tsx` | Dùng `APP_VERSION` thay date string |
| Changelog source (cần xác định) | Thêm entry `1.0.1` với danh sách changes |

## Câu hỏi cần làm rõ trước khi implement

Mình cần biết changelog đang lưu ở đâu (JSON file? hardcode trong hook? database?) để biết cách thêm entry `1.0.1`. Sẽ kiểm tra `useChangelog.ts` ở bước implement.

**Nội dung changelog v1.0.1 đề xuất:**
- ✨ Mới: Realtime cập nhật nhân viên đang trong ca khi giao việc
- ⚡ Cải tiến: Vuốt/chạm mượt mà hơn trên toàn bộ app
- 🔧 Sửa lỗi: PWA trên iPhone tự động cập nhật phiên bản mới
- 🔧 Sửa lỗi: Trang Kho không còn bị giật khi vuốt

Bạn xác nhận nội dung changelog trên có ổn không, hay muốn mình điều chỉnh?
