## Nhóm 2: Tối ưu chuyển trang (mục 6 + 7)

Mục tiêu: chuyển trang gần như tức thì, không còn skeleton chớp nháy khi đổi filter/tab, dữ liệu sẵn sàng ngay khi vào trang.

---

### Mục 6 — `placeholderData: keepPreviousData` cho list hooks

**Vấn đề hiện tại:** Mỗi lần đổi `filters`, `page`, `selectedHotel`, query key đổi → React Query bỏ data cũ → component thấy `isLoading=true` → skeleton chớp → khó chịu.

**Giải pháp:** Thêm `placeholderData: keepPreviousData` (React Query v5) — giữ data cũ hiển thị trong khi fetch data mới, chỉ thay khi có kết quả mới.

**Phạm vi áp dụng (8 hooks chính):**
1. `useRooms` (src/hooks/useRooms.ts)
2. `useBookings` (src/hooks/useBookings.ts)
3. `useInventoryItems` (src/hooks/useInventoryItems.ts hoặc tương đương)
4. `useRoutesWithFilters` (src/hooks/useRouteFilters.ts) — đang ở trang user xem
5. `usePurchaseOrders` (src/hooks/usePurchaseOrders.ts)
6. `useVendors` (src/hooks/useVendors.ts)
7. `useMaintenanceRequests`
8. `useLaundryBatches`

**Cách làm:**
```ts
import { keepPreviousData } from '@tanstack/react-query'

return useQuery({
  queryKey: [...],
  queryFn: ...,
  placeholderData: keepPreviousData,
  staleTime: 30_000, // bonus: giảm refetch khi quay lại
})
```

**Cộng:**
- Không còn flash skeleton khi đổi tab/filter/page
- Cảm giác "instant" rõ rệt
- Zero rủi ro về business logic (chỉ đổi UX render)

**Trừ:**
- User có thể thấy data cũ ~200–500ms khi đổi filter (thường không nhận ra)
- Có thể cần thêm indicator nhỏ `isFetching` để báo "đang cập nhật" ở các bảng lớn

---

### Mục 7 — Prefetch React Query data on `onPointerDown`

**Vấn đề hiện tại:** `useIdlePrefetch` đã prefetch JS chunks, nhưng khi vào trang vẫn phải đợi network query (300–800ms). Data chưa sẵn sàng → vẫn thấy skeleton lần đầu.

**Giải pháp:** Khi user `pointerdown` (chạm/click chưa thả) trên link sidebar/bottom nav → gọi `queryClient.prefetchQuery(...)` cho query chính của trang đích. Đến lúc Router render trang → data đã có sẵn trong cache.

**Phạm vi (chỉ 4 route đông user nhất):**
- `/dashboard` → prefetch `useDashboardMetrics`
- `/rooms` → prefetch `useRooms({})` (filter mặc định)
- `/bookings` → prefetch `useBookings({})`
- `/inventory/distributions` → prefetch `useRoutesWithFilters({}, 1, 25)`

**Cách làm:**

Tạo `src/lib/route-data-prefetch.ts`:
```ts
type PrefetchFn = (qc: QueryClient, ctx: PrefetchCtx) => Promise<void>

export const ROUTE_DATA_PREFETCH: Record<string, PrefetchFn> = {
  '/rooms': async (qc, { tenantId, hotelId }) => {
    await qc.prefetchQuery({
      queryKey: ['rooms', tenantId, hotelId, {}],
      queryFn: () => fetchRooms(tenantId, hotelId, {}),
      staleTime: 30_000,
    })
  },
  // ...
}
```

Trong `Sidebar.tsx` / `MobileBottomNav.tsx`:
```tsx
<Link
  to={item.path}
  onPointerDown={() => {
    prefetchRouteChunk(item.path)        // đã có (JS)
    prefetchRouteData(item.path, ctx)    // MỚI (data)
  }}
>
```

**Cộng:**
- Trang mở gần như tức thì (cache hit ngay khi mount)
- Tận dụng "intent gap" (200–400ms giữa pointerdown và pointerup)

**Trừ:**
- Lãng phí băng thông nếu user pointerdown nhầm rồi không click (hiếm, chỉ 1 query)
- Phải duy trì query key đồng bộ giữa hook và prefetcher (nếu lệch → cache miss vô hại)
- Mỗi route mới muốn prefetch phải đăng ký vào map

**Giảm thiểu rủi ro:**
- Chỉ prefetch query "trang trống filter" (filter mặc định), không prefetch theo state hiện tại
- Throttle 1 lần / route / 30s để không spam
- Bỏ qua nếu Network Information API báo `saveData` hoặc `2g/3g`

---

### Phần kỹ thuật phụ

- **Bump version:** `APP_VERSION` → `1.0.20`, `CURRENT_VERSION` trong CacheBuster, thêm entry `changelog.json`
- **Không cần migration**
- **Không có thay đổi business logic**
- **Test cần chạy:** lint + typecheck (auto), manual QA chuyển tab nhanh giữa Dashboard/Rooms/Bookings/Distributions

---

### Đề xuất triển khai

Làm **cả 6 và 7** trong cùng 1 release `1.0.20`:
1. Trước: thêm `keepPreviousData` cho 8 hooks (mục 6) — an toàn, lợi ích lớn nhất
2. Sau: thêm data prefetch cho 4 route phổ biến (mục 7) — boost thêm

Ước lượng: ~25–30 phút build, rủi ro thấp, không breaking change.
