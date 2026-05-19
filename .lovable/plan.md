## Vấn đề

`PricingSection` (và bất kỳ component nào dùng `t(..., { returnObjects: true })` trên namespace `landing`) crash với `l.map is not a function` ngay khi mở `/` lần đầu.

**Root cause:**
- `src/i18n/index.ts` chỉ eager-bundle 9 namespace lớn (common, auth, dashboard, …). Namespace `landing` lazy-load qua `import.meta.glob`.
- `useTranslation('landing')` được cấu hình `useSuspense: false`. Khi component render frame đầu mà file `vi/landing.json` chưa fetch xong, `t('pricing.starter.features', { returnObjects: true })` trả về **string key fallback** thay vì array → `.map` ném `TypeError`.
- Lỗi này lan ra ErrorBoundary của React Router → user thấy "Unexpected Application Error".

## Giải pháp (2 lớp, an toàn)

### 1. Eager-bundle namespace `landing`
Trang chủ luôn cần `landing`, nên không có lý do lazy.

`src/i18n/index.ts`:
- Import `viLanding from './locales/vi/landing.json'`.
- Thêm `'./locales/vi/landing.json'` vào `EAGER_KEYS`.
- Thêm `landing: viLanding` vào `resources.vi`.

### 2. Guard runtime cho mọi `returnObjects` trong landing
Phòng trường hợp tương lai có thêm key array bị thiếu.

`src/components/landing/PricingSection.tsx`:
```ts
const featuresRaw = t(`pricing.${plan}.features`, { returnObjects: true, defaultValue: [] });
const features = Array.isArray(featuresRaw) ? featuresRaw as string[] : [];
```

`src/components/landing/FeaturesSection.tsx` — rà soát, áp dụng cùng pattern nếu có dùng `returnObjects`.

## File sẽ thay đổi
- ✏️ `src/i18n/index.ts` — eager bundle `landing`
- ✏️ `src/components/landing/PricingSection.tsx` — `Array.isArray` guard
- ✏️ `src/components/landing/FeaturesSection.tsx` — guard nếu cần (chỉ khi có `returnObjects`)
- ✏️ `src/lib/app-version.ts` → `1.0.31`
- ✏️ `public/changelog.json` — entry mới

## Test
1. Hard reload `/` ở mobile + desktop → không còn lỗi, pricing render đủ 3 cột.
2. Throttle Slow 3G trong DevTools → vẫn không crash (vì giờ landing eager bundled).
3. Build size: tăng ~2-5KB (landing.json) — chấp nhận được vì là trang public.

## Rollback
Revert 4 file. Không schema/migration.

**Duyệt để triển khai?**