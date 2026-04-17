/**
 * Single source of truth cho phiên bản app.
 *
 * 📋 Quy trình mỗi lần deploy:
 * 1. Bump APP_VERSION (ví dụ 1.0.1 → 1.0.2)
 * 2. Cập nhật APP_VERSION_DATE
 * 3. Thêm entry mới vào public/changelog.json (cùng version)
 *
 * → MorePage sẽ tự hiển thị phiên bản mới
 * → CacheBuster sẽ tự wipe cache cũ + reload PWA trên iPhone
 * → PWAUpdatePrompt sẽ tự hiện popup với changelog mới
 */
export const APP_VERSION = '1.0.1';
export const APP_VERSION_DATE = '2026-04-17';
