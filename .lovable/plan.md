

## Ra soat con lai - 1 van de can fix

### Ket qua kiem tra

Sau khi ra soat toan bo codebase, chi con **1 file** dung pattern cu `!== 'all'` lien quan den multi-hotel:

### `src/pages/bookings/BookingsPage.tsx`

**Van de 1 - Dong 253**: Dung `selectedHotelId !== 'all'` (pattern cu) thay vi `isAllHotelsMode`
```
// Hien tai (sai)
if (selectedHotelId && selectedHotelId !== 'all') {
  query = query.eq('hotel_id', selectedHotelId)
}

// Can doi thanh
if (!isAllHotelsMode && selectedHotelId) {
  query = query.eq('hotel_id', selectedHotelId)
}
```

**Van de 2 - Dong 234**: queryKey thieu `isAllHotelsMode`, gay cache collision khi chuyen mode
```
// Hien tai
queryKey: ['all-bookings', selectedHotelId, statusFilter]

// Can doi thanh
queryKey: ['all-bookings', isAllHotelsMode ? 'all' : selectedHotelId, statusFilter]
```

**Booking wizard**: Khong can guard nut "Them dat phong" vi BookingWizard lay `hotel_id` tu phong duoc chon (room.hotel_id), hoat dong dung trong ca 2 mode.

---

### Cac file khac da kiem tra - KHONG co van de

| File/Pattern | Ket qua |
|---|---|
| `UserFilters.tsx` - `hotelId !== 'all'` | OK - Day la filter dropdown local, khong lien quan isAllHotelsMode |
| `useHotels.ts`, `useVendors.ts`, `usePurchaseOrders.ts` - `!== 'all'` | OK - Filter dropdown cho status/category, khong phai hotel filter |
| Tat ca hooks da fix truoc do | OK - Da dung isAllHotelsMode chuan |
| Cac form tao moi (distribution, maintenance, laundry, item) | OK - Da co alert va disable button |

---

### Thay doi can thuc hien

| # | File | Dong | Thay doi |
|---|------|------|---------|
| 1 | `src/pages/bookings/BookingsPage.tsx` | 234 | Them `isAllHotelsMode` vao queryKey |
| 2 | `src/pages/bookings/BookingsPage.tsx` | 253 | Thay `selectedHotelId !== 'all'` bang `!isAllHotelsMode` |

Day la thay doi nho, chi 2 dong trong 1 file.

