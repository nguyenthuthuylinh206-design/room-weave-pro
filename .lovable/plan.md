

## Fix 4 van de Multi-Hotel

### 1. `usePendingCounts.ts` - Xoa duplicate filter hotel_id

**Dong 64 va 69**: `distributionsQuery` goi `.eq('hotel_id', hotelId)` 2 lan. Xoa dong 69.

---

### 2. `useBookingStats.ts` - Thay `hotelId !== 'all'` bang `isAllHotelsMode`

**Van de**: 3 hook (`useBookingStats`, `useTodayCheckouts`, `useTodayCheckins`) deu dung pattern `hotelId && hotelId !== 'all'` thay vi `isAllHotelsMode` chuan.

**Thay doi** (ap dung cho ca 3 hook):
- Import `isAllHotelsMode` tu `useHotelContext()`
- Thay tat ca `if (hotelId && hotelId !== 'all')` thanh `if (!isAllHotelsMode && hotelId)`
- Them `isAllHotelsMode` vao `queryKey` de cache dung khi chuyen mode

---

### 3. `useAvailableRooms.ts` - Tuong tu, thay `hotelId !== 'all'`

**Dong 85**: Dung `hotelId && hotelId !== 'all'`. Thay bang `!isAllHotelsMode && hotelId` (hook da import `isAllHotelsMode` roi).

---

### 4. `useStaffStatistics.ts` - Ho tro All Hotels mode

**Van de**: Ca 3 hook (`useStaffStatistics`, `useCalculateStaffStatistics`, `useTopPerformingStaff`) throw error khi `selectedHotel.id` null (All Hotels mode). Query chi filter theo 1 hotel.

**Thay doi**:
- Import `isAllHotelsMode` tu `useHotelContext()`
- `useStaffStatistics`: Bo dieu kien `!selectedHotel?.id` throw error. Khi `isAllHotelsMode`, bo `.eq('hotel_id', ...)` de lay tat ca hotels. Them `isAllHotelsMode` vao queryKey. Doi `enabled` thanh `!!tenant?.id` (bo yeu cau hotel).
- `useTopPerformingStaff`: Tuong tu, khi `isAllHotelsMode` bo filter hotel_id. Doi `enabled` bo yeu cau hotel.
- `useCalculateStaffStatistics`: Giu nguyen vi mutation can hotel cu the de tinh toan.

---

### Danh sach file thay doi

| # | File | Thay doi |
|---|------|---------|
| 1 | `src/hooks/usePendingCounts.ts` | Xoa dong 69 (duplicate `.eq('hotel_id')`) |
| 2 | `src/hooks/useBookingStats.ts` | 3 hooks: thay `hotelId !== 'all'` bang `isAllHotelsMode`, them vao queryKey |
| 3 | `src/hooks/useAvailableRooms.ts` | Thay `hotelId !== 'all'` bang `!isAllHotelsMode` |
| 4 | `src/hooks/useStaffStatistics.ts` | 2 hooks ho tro All Hotels mode |

