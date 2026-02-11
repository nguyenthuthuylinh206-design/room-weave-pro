

## Them chuc nang tai len Logo khach san

### Hien trang

- Bang `hotels` da co cot `logo_url` (string | null) - san sang su dung
- `HotelFormDialog` chua co truong upload logo
- `HotelCard` dung icon `Building2` co dinh, chua hien thi logo
- Da co `useImageUpload` hook upload len bucket `item-images`
- Da co component `ImageUpload` (multi-image) - nhung can tao component don gian hon cho single logo

### Ke hoach

#### 1. Tao storage bucket `hotel-logos`

Tao bucket rieng cho logo khach san (public) voi RLS policy cho phep tenant upload/delete.

#### 2. Them `logo_url` vao `HotelFormData` interface

Them truong `logo_url?: string` vao interface trong `useHotels.ts`, va cap nhat `useCreateHotel` / `useUpdateHotel` de luu `logo_url`.

#### 3. Them logo upload vao `HotelFormDialog`

- Them vao Step 1 (phia tren truong Code): Hien thi avatar tron voi nut upload
- Click de chon file anh -> Upload len bucket `hotel-logos` -> Luu URL
- Hien thi preview logo sau khi upload, co nut X de xoa
- Su dung `useImageUpload` hook (sua bucket thanh `hotel-logos`)
- Giao dien: Avatar tron 80x80, click de upload, compact theo chuan Enterprise SaaS

#### 4. Hien thi logo trong `HotelCard`

Thay icon `Building2` bang logo thuc te neu co `hotel.logo_url`:
- Dung `Avatar` component voi `AvatarImage` + `AvatarFallback` (Building2 icon)
- Kich thuoc giu nguyen `p-2 rounded-lg`

#### 5. Hien thi logo trong `MobileHotelManagementPage`

Tuong tu, thay icon `Building2` bang logo neu co.

### Chi tiet ky thuat

| File | Thay doi |
|------|---------|
| Migration SQL | Tao bucket `hotel-logos` + RLS policies |
| `src/hooks/useHotels.ts` | Them `logo_url` vao `HotelFormData`, cap nhat create/update mutations |
| `src/components/settings/hotels/HotelFormDialog.tsx` | Them logo upload UI (avatar + file input), su dung `useImageUpload` |
| `src/components/settings/hotels/HotelCard.tsx` | Hien thi logo thay Building2 icon |
| `src/components/settings/MobileHotelManagementPage.tsx` | Hien thi logo thay Building2 icon |

### Upload UI trong form

```text
+---------------------------+
|   [  Logo 80x80  ]        |  <- Avatar tron, click de upload
|   Tai len logo (tuy chon) |  <- Label nho phia duoi
+---------------------------+
| Ma khach san *             |
| [___________]              |
| Ten khach san *            |
| ...                        |
```

- Khi chua co logo: Hien thi icon Upload + text "Chon logo"
- Khi da co logo: Hien thi anh + nut X goc tren phai de xoa
- Dang upload: Hien thi spinner
- Chi chap nhan file anh, toi da 2MB

