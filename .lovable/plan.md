

## Nang cap Bao cao Doanh thu (Revenue Report)

### Hien trang

Hien tai da co:
- `useRevenueReport` hook: Query `room_bookings`, tinh today/thisMonth/lastMonth/6-month trends
- `RevenueReportPage`: Hien thi 4 stat cards + area chart + so sanh thang truoc
- `MobileRevenueReportPage`: Phien ban mobile
- `OwnerProfitOverview` + `OwnerRevenueOverview`: Dashboard widget

### Van de

1. **Period filter khong hoat dong**: State `period` trong `RevenueReportPage` khong duoc truyen xuong hook - luon hien thi thang hien tai
2. **Thieu phan tich chi tiet**:
   - Khong co breakdown theo `booking_type` (daily/hourly/monthly)
   - Khong co breakdown theo `booking_source` (direct/Booking.com/Agoda...)
   - Khong co phan tich phu thu (early check-in, late checkout, damage charges)
   - Khong co phan tich OTA commission vs net revenue
3. **Thieu bao cao theo phong/loai phong**: Revenue per room, top rooms
4. **Export khong hoat dong**: Nut "Xuat bao cao" chua co logic
5. **UI chua theo chuan Enterprise SaaS**: Dung `Card` + `bg-*-50` thay vi `border rounded-lg`

### Giai phap

#### 1. Nang cap `useRevenueReport` hook

Mo rong hook de tinh them:

| Metric moi | Nguon du lieu |
|------------|---------------|
| Revenue theo booking_type (daily/hourly/monthly) | `room_bookings.booking_type` |
| Revenue theo booking_source (Direct/OTA) | `room_bookings.booking_source` |
| OTA commission tong | `room_bookings.ota_commission_amount` |
| Net revenue (sau OTA) | `room_bookings.net_revenue` |
| Phu thu: early check-in, late checkout | `early_checkin_charge`, `late_checkout_charge` |
| Damage charges | `room_bookings.damage_charges` |
| Top 5 phong doanh thu cao nhat | Join `rooms(room_number, room_type)` |

Them tham so `period` de filter theo tuan/thang/quy/nam thay vi luon la thang hien tai.

#### 2. Redesign `RevenueReportPage` (Desktop)

Cau truc moi:

```text
+--------------------------------------------------+
| Bao cao Doanh thu          [Tuan v] [Xuat bao cao] |
+--------------------------------------------------+
| Da thu    | Cho TT   | Net Revenue | Bookings     |
| 12.5M     | 3.2M     | 10.8M       | 45           |
+--------------------------------------------------+
| [Tab: Tong quan | Theo loai | Theo nguon | Phong] |
+--------------------------------------------------+

Tab Tong quan:
- Area chart xu huong 6 thang (giu nguyen)
- So sanh voi ky truoc (compact, khong bg mau)

Tab Theo loai (booking_type):
- Bang: Daily | Hourly | Monthly - so booking, doanh thu, % tong
- Bar chart so sanh

Tab Theo nguon (booking_source):
- Bang: Direct | Booking.com | Agoda | ... 
- Cot: Bookings, Gross Revenue, OTA Commission, Net Revenue
- Pie chart phan bo

Tab Phong:
- Bang top phong theo doanh thu
- Cot: Phong, Loai, So booking, Doanh thu, Phu thu, Tong
```

#### 3. Nang cap `MobileRevenueReportPage`

- Them section breakdown theo `booking_type` (3 dong compact)
- Them section OTA summary (gross vs net)
- Bo `bg-*-50` theo chuan Enterprise SaaS

#### 4. Them export PDF/Excel

Su dung `jspdf` + `jspdf-autotable` (da cai) cho PDF va `xlsx` (da cai) cho Excel.

### File thay doi

| File | Thay doi |
|------|---------|
| `src/hooks/useRevenueReport.ts` | Them `period` param, tinh breakdown theo booking_type/source/room, OTA metrics, phu thu |
| `src/pages/reports/RevenueReportPage.tsx` | Redesign voi tabs, truyen period vao hook, them export logic, ap dung Enterprise SaaS style |
| `src/components/reports/MobileRevenueReportPage.tsx` | Them breakdown sections, bo bg mau |
| `src/components/reports/RevenueByTypeChart.tsx` | **Moi** - Bar chart theo booking_type |
| `src/components/reports/RevenueBySourceTable.tsx` | **Moi** - Bang + pie chart theo booking_source |
| `src/components/reports/TopRoomsRevenueTable.tsx` | **Moi** - Bang top phong doanh thu |
| `src/components/reports/useRevenueExport.ts` | **Moi** - Hook xuat PDF/Excel |

### Khong thay doi database

Tat ca du lieu can thiet da co san trong bang `room_bookings`. Chi can query va aggregate phia client.

