## Mục tiêu

Khắc phục triệt để hiện tượng "preview hiển thị bản cũ, chỉ đúng khi bật Visual Edits". Nguyên nhân là Service Worker (PWA) cache app shell + Supabase REST trong iframe preview của Lovable.

## Phạm vi thay đổi

Chỉ frontend + 1 SW kill-switch. Không đụng business logic, không đụng database.

---

### A. Kiến trúc / logic

1. **Guard đăng ký SW**: Không register Service Worker khi:
   - Đang chạy trong iframe (`window.self !== window.top`)
   - Hostname chứa `id-preview--`, `lovableproject.com`, hoặc `localhost`
2. **Auto-cleanup**: Trong các môi trường trên, nếu phát hiện SW cũ đã đăng ký từ trước → tự động `unregister()` + `caches.delete()` toàn bộ → reload 1 lần.
3. **Production (`room-weave-pro.lovable.app` + custom domain)**: SW vẫn hoạt động bình thường, PWA install + offline vẫn đầy đủ.
4. **Bump version một lần** để CacheBuster wipe cache cho user/PWA đang stuck.

---

### B. Schema / migration

Không có.

---

### C. API / RPC

Không có.

---

### D. UI / Files thay đổi

| File | Thay đổi |
|---|---|
| `src/hooks/usePWAUpdate.ts` | Bọc toàn bộ `useRegisterSW` + interval update bằng guard `shouldEnablePWA()`. Khi không enable: chỉ chạy nhánh cleanup (unregister + clear caches), không đăng ký SW mới. |
| `src/components/pwa/CacheBuster.tsx` | Thêm cùng guard: trong preview/iframe luôn wipe cache + unregister SW mỗi lần load (không phụ thuộc version). |
| `src/lib/pwa-environment.ts` *(mới)* | Helper duy nhất `shouldEnablePWA()` + `isPreviewOrIframe()` để dùng chung, tránh lặp logic. |
| `src/lib/app-version.ts` | Bump `1.0.5` → `1.0.6`, cập nhật `APP_VERSION_DATE`. |
| `public/changelog.json` | Thêm entry 1.0.6: "Sửa lỗi cache PWA giữ bản cũ trong môi trường preview". |
| `vite.config.ts` *(kiểm tra)* | Đảm bảo `VitePWA` đã có `devOptions.enabled: false`. Nếu chưa → tắt. |

---

### E. Permission / role

Không ảnh hưởng.

---

### F. Test cases

1. **Preview iframe (editor Lovable)**: Mở DevTools → Application → Service Workers → phải là **trống** hoặc đang unregister. Cache Storage trống. Sửa 1 file → reload preview → thấy thay đổi ngay, không cần bật Visual Edits.
2. **Production (`room-weave-pro.lovable.app`)**: SW vẫn register. `navigator.serviceWorker.getRegistrations()` trả về 1 entry. PWA install vẫn được. Sau khi deploy bản mới + bump version → CacheBuster trigger reload đúng 1 lần.
3. **PWA đã cài trên iPhone**: Mở app sau update → CacheBuster phát hiện version mismatch → wipe + reload → hiển thị bản 1.0.6.
4. **Localhost dev**: SW không register, HMR Vite hoạt động bình thường.

---

### G. Rollout notes

- Không breaking change. User cuối chỉ thấy 1 lần reload tự động sau khi mở app lần đầu sau deploy.
- Nếu muốn rollback: revert 3 file (`usePWAUpdate.ts`, `CacheBuster.tsx`, `pwa-environment.ts`) — SW sẽ register lại như cũ.
- Sau merge: nhắc user **F5 cứng (Ctrl+Shift+R)** trên trình duyệt thường lệ một lần để cleanup chạy.

---

### Tại sao cách này chuẩn hơn các fix trước

Memory `pwa/cache-busting-v1` hiện tại chỉ dựa vào việc bump version mỗi release — nhưng **trong editor preview thì không bao giờ bump version giữa các lần chỉnh sửa nhỏ**, nên SW cũ vẫn serve bản stale. Guard ở tầng register là cách duy nhất triệt để cho môi trường iframe.
