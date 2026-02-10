

## Redesign ExtendBookingDialog va ConflictWarningSection - Enterprise SaaS Minimalist

### Van de hien tai

Hai component nay van con "mau me", chua theo chuan Enterprise SaaS Minimalist:

1. **ConflictWarningSection**: `border-2 border-red-500 bg-red-50` - vien do day + nen do
2. **Title mau sac**: `text-red-600` / `text-amber-600` tren title - qua noi bat
3. **Emoji trong heading**: `⚠️` trong h4 - khong chuyen nghiep
4. **Border-t mau**: `border-red-200` trong action section
5. **Button destructive**: Nut "Checkout ngay" dung `variant="destructive"` - nen do
6. **Cost preview**: `bg-muted/50` - nen xam khong can thiet

### Thay doi cu the

#### File 1: `ConflictWarningSection.tsx`

| Truoc | Sau |
|-------|-----|
| `border-2 border-red-500 bg-red-50 dark:bg-red-950/30` | `border rounded-lg` |
| `⚠️ KHACH TIEP THEO...` (emoji + all caps) | `Khach tiep theo da den ngay check-in` (icon only, sentence case) |
| `font-semibold text-red-700` | `text-sm font-medium text-red-600` |
| `border-t border-red-200` | `border-t` (border mac dinh) |
| `variant="destructive"` cho Checkout ngay | `variant="outline"` + `text-red-600` |
| `p-4 space-y-3` | `p-3 space-y-2` (compact hon) |

#### File 2: `ExtendBookingDialog.tsx`

| Truoc | Sau |
|-------|-----|
| Title dung `AlertOctagon` / `AlertTriangle` icon trong DialogTitle | Bo icon ra khoi title, giu text don gian: "Gia han phong [P102]" |
| Title className `text-red-600` / `text-amber-600` | Mac dinh (khong mau) |
| DialogDescription dai dong | Rut gon thanh 1 dong ngan: "Qua han N dem - Can gia han truoc khi checkout" |
| `bg-muted/50 p-3` cho cost preview | `border rounded-lg p-3` (khong nen) |
| `text-primary` cho tong phi | `font-semibold` (khong mau dac biet) |

#### Cau truc dialog moi (gon hon)

```text
+---------------------------------------+
| Gia han phong P102              [X]   |
| Qua han 10 dem                        |
+---------------------------------------+
| Khach: Nguyen Duc Phuoc    P102       |  <- 1 dong gop
| Checkout cu: 31/01  |  Qua han: 10d  |  <- 1 dong gop
+---------------------------------------+
| [Conflict section - neu co]           |
| Khach tiep theo da den ngay check-in  |
| Ten: ...  |  Check-in: ...            |
| SĐT: ...  [copy] [call]              |
| [Checkout ngay] [Chuyen phong]        |
+---------------------------------------+
| Ngay tra phong moi: [____chon____]    |
+---------------------------------------+
| N dem x gia/dem = tong                |  <- 1 dong don gian
+---------------------------------------+
|                    [Huy] [Gia han]    |
+---------------------------------------+
```

### Nguyen tac ap dung

- Bo tat ca `bg-*-50`, `border-*-color` -> chi `border rounded-lg`
- Bo emoji, chi dung icon khi can
- Title trung tinh, khong mau
- Compact: `p-3`, `text-sm`, `text-xs`
- Semantic text colors chi cho data (ngay qua han = `text-red-600`)
- Nut hanh dong: tat ca `variant="outline"`, phan biet bang text color

### File thay doi

| File | Mo ta |
|------|-------|
| `src/components/bookings/ConflictWarningSection.tsx` | Bo bg/border mau, emoji, compact layout, outline buttons |
| `src/components/bookings/ExtendBookingDialog.tsx` | Don gian title/description, bo icon title, compact booking info, bo bg cost preview |

