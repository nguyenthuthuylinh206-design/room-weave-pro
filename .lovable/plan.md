

## Fix: Gioi han so phong trong chuc nang thanh toan va gia han

### Van de hien tai

- Goi "Tieu Chuan" (standard) co `max_rooms = NULL` trong database, nghia la **khong gioi han**
- `PlanChangeDialog.tsx` cho nhap tu do len den 9999 phong (dong 105)
- `AddRoomsDialog.tsx` cho nhap len den 1000 phong khong kiem tra gioi han plan
- `sepay-webhook` cap nhat `registered_rooms` truc tiep tu metadata khong validate
- Khong kiem tra invoice pending truoc khi tao moi

### Giai phap (5 buoc)

| # | Thay doi | File |
|---|---------|------|
| 1 | Dat `max_rooms = 500` cho goi Standard | Database migration |
| 2 | Gioi han input phong theo `max_rooms` cua plan | `PlanChangeDialog.tsx` |
| 3 | Gioi han input phong theo `max_rooms` cua plan | `AddRoomsDialog.tsx` |
| 4 | Validate `max_rooms` phia server truoc khi cap nhat | `sepay-webhook/index.ts` |
| 5 | Kiem tra pending invoice truoc khi tao moi | `BankTransferPaymentDialog.tsx` |

### Chi tiet ky thuat

**1. Database: Dat max_rooms cho goi Standard**

```sql
UPDATE subscription_plans SET max_rooms = 500 WHERE code = 'standard';
```

**2. PlanChangeDialog.tsx**

- Lay `max_rooms` tu subscription plan
- Thay `Math.min(9999, value)` thanh `Math.min(maxRooms, value)`
- Hien thong bao khi dat gioi han

```typescript
const maxRooms = (subscription?.subscription_plan as any)?.max_rooms || 500;

const handleRoomsChange = (value: number) => {
  setRooms(Math.max(1, Math.min(maxRooms, value)));
};
```

- Vo hieu hoa nut "+" khi dat `maxRooms`
- Hien text: "Gioi han toi da: X phong theo goi dich vu"

**3. AddRoomsDialog.tsx**

- Fetch `max_rooms` tu plan
- Gioi han: `registeredRooms + additionalRooms <= maxRooms`
- Max additional = `maxRooms - registeredRooms`
- Hien canh bao khi vuot gioi han

**4. sepay-webhook/index.ts**

Truoc khi cap nhat `registered_rooms`, fetch plan limit va cap:

```typescript
// Fetch plan limit
const { data: tenantPlan } = await supabase
  .from('tenants')
  .select('subscription_plan_id')
  .eq('id', tenantId)
  .single();

if (tenantPlan?.subscription_plan_id) {
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('max_rooms')
    .eq('id', tenantPlan.subscription_plan_id)
    .single();

  if (plan?.max_rooms && newTotalRooms > plan.max_rooms) {
    newTotalRooms = plan.max_rooms; // Cap at limit
  }
}
```

Ap dung cho ca 2 flow: `extend` (thay doi so phong) va `add_rooms`.

**5. BankTransferPaymentDialog.tsx**

Kiem tra con invoice pending khong truoc khi tao moi:

```typescript
const { data: pendingInvoices } = await supabase
  .from('invoices')
  .select('id, invoice_number')
  .eq('tenant_id', tenantId)
  .eq('status', 'sent')
  .limit(1);

if (pendingInvoices?.length) {
  toast.error('Ban con hoa don chua thanh toan. Vui long thanh toan hoac huy truoc.');
  return;
}
```

### Ket qua mong doi

- Khach hang chi co the dang ky toi da so phong theo gioi han cua goi (500 phong cho goi Standard)
- Server-side validation dam bao khong vuot gioi han du co bypass UI
- Khong the tao nhieu invoice chong cheo

