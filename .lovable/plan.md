

## Phân tích lỗi chọn Item trong Laundry Batch

### VẤN ĐỀ ĐÃ XÁC ĐỊNH

Sau khi kiểm tra code và dữ liệu, tôi phát hiện **2 vấn đề chính**:

---

### VẤN ĐỀ 1: Lỗi tìm kiếm trong CommandItem (cmdk)

**File:** `src/components/laundry/CreateBatchStep2.tsx` (Line 150-165)

**Nguyên nhân:**
Component `Select` từ Radix UI hoạt động bình thường, nhưng khi kết hợp với tìm kiếm, có vấn đề về **filtering**:

```typescript
// Hiện tại - Line 150-151:
<Select onValueChange={field.onChange} value={field.value}>
  <FormControl><SelectTrigger><SelectValue placeholder={t('createBatch.step2.selectItem')} /></SelectTrigger></FormControl>
  <SelectContent>
    {availableItems.map((item) => (
      <SelectItem key={item.id} value={item.id}>
```

**Vấn đề tiềm ẩn:**
- `SelectContent` không có tìm kiếm built-in
- Khi danh sách item dài, khó tìm item cần chọn
- Không có empty state khi `availableItems` rỗng

---

### VẤN ĐỀ 2: Query Categories thiếu filter `tenant_id`

**File:** `src/components/laundry/CreateBatchStep2.tsx` (Line 62-74)

```typescript
const { data: launderableCategories } = useQuery({
  queryKey: ['launderable-categories', tenantId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('item_categories')
      .select('id')
      .eq('is_launderable', true)
      .eq('status', 'active')
      // ❌ THIẾU: .eq('tenant_id', tenantId)
    if (error) throw error
    return data?.map(cat => cat.id) || []
  },
  enabled: !!tenantId,
})
```

**Hậu quả:**
- Query lấy TẤT CẢ categories có `is_launderable = true` từ mọi tenant
- Có thể gây lỗi match sai category_id giữa các tenant
- RLS có thể chặn query nếu không đúng tenant

---

### VẤN ĐỀ 3: Không có Empty State & Loading State

**Hiện tượng:** Khi không có items (do filter hoặc RLS), dropdown hiển thị trống không có hướng dẫn.

---

## SƠ ĐỒ LUỒNG HIỆN TẠI

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        LAUNDRY BATCH - STEP 2                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────┐     ┌─────────────────────┐                  │
│   │   useItems()        │     │  Query Categories   │                  │
│   │   status='active'   │     │  is_launderable=true│                  │
│   │   hotelId=selected  │     │  ❌ MISSING tenant  │                  │
│   └─────────┬───────────┘     └─────────┬───────────┘                  │
│             │                           │                               │
│             ▼                           ▼                               │
│   ┌─────────────────────────────────────────────────┐                  │
│   │              Filter availableItems              │                  │
│   │   hasStock && category IN launderableCategories │                  │
│   └─────────────────────────┬───────────────────────┘                  │
│                             │                                           │
│                             ▼                                           │
│   ┌─────────────────────────────────────────────────┐                  │
│   │          <Select> Component (Radix)             │                  │
│   │   ❌ No search functionality                    │                  │
│   │   ❌ No empty state when availableItems = []    │                  │
│   │   ❌ No loading indicator                       │                  │
│   └─────────────────────────────────────────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## GIẢI PHÁP

### Sửa 1: Thêm `tenant_id` filter cho categories query

```typescript
const { data: launderableCategories } = useQuery({
  queryKey: ['launderable-categories', tenantId],
  queryFn: async () => {
    if (!tenantId) return []
    const { data, error } = await supabase
      .from('item_categories')
      .select('id')
      .eq('tenant_id', tenantId)  // ✅ THÊM FILTER NÀY
      .eq('is_launderable', true)
      .eq('status', 'active')
    if (error) throw error
    return data?.map(cat => cat.id) || []
  },
  enabled: !!tenantId,
})
```

### Sửa 2: Thêm Empty State & Loading State cho Select

```typescript
<SelectContent>
  {itemsQuery.isLoading ? (
    <SelectItem value="loading" disabled>Đang tải...</SelectItem>
  ) : availableItems.length === 0 ? (
    <SelectItem value="empty" disabled>
      Không có đồ vải có thể giặt trong kho
    </SelectItem>
  ) : (
    availableItems.map((item) => (
      <SelectItem key={item.id} value={item.id}>...</SelectItem>
    ))
  )}
</SelectContent>
```

### Sửa 3: Áp dụng tương tự cho MobileBatchForm.tsx

File này cũng có cùng vấn đề (Line 70-82) - thiếu `tenant_id` filter.

---

## SƠ ĐỒ LUỒNG SAU KHI SỬA

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                   LAUNDRY BATCH - STEP 2 (FIXED)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────┐     ┌─────────────────────┐                  │
│   │   useItems()        │     │  Query Categories   │                  │
│   │   status='active'   │     │  tenant_id=current  │ ✅               │
│   │   hotelId=selected  │     │  is_launderable=true│                  │
│   └─────────┬───────────┘     └─────────┬───────────┘                  │
│             │                           │                               │
│             ▼                           ▼                               │
│   ┌─────────────────────────────────────────────────┐                  │
│   │              Filter availableItems              │                  │
│   │   hasStock && category IN launderableCategories │                  │
│   └─────────────────────────┬───────────────────────┘                  │
│                             │                                           │
│              ┌──────────────┴──────────────┐                            │
│              │                             │                            │
│              ▼                             ▼                            │
│   ┌──────────────────┐          ┌──────────────────┐                   │
│   │  Loading State   │          │   Empty State    │                   │
│   │  "Đang tải..."   │          │ "Không có đồ vải"│                   │
│   └──────────────────┘          └──────────────────┘                   │
│                             │                                           │
│                             ▼                                           │
│   ┌─────────────────────────────────────────────────┐                  │
│   │     <Select> với danh sách items ✅             │                  │
│   │     - Hiển thị tên, mã, tồn kho                 │                  │
│   │     - Badge "Sắp hết" khi tồn < 10              │                  │
│   └─────────────────────────────────────────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## FILES CẦN SỬA

| Action | File | Mô tả |
|--------|------|-------|
| Sửa | `src/components/laundry/CreateBatchStep2.tsx` | Thêm tenant_id filter, empty/loading state |
| Sửa | `src/components/laundry/MobileBatchForm.tsx` | Thêm tenant_id filter |

---

## CHI TIẾT THAY ĐỔI

### CreateBatchStep2.tsx

1. **Line 65**: Thêm `.eq('tenant_id', tenantId)` vào query categories
2. **Line 152-163**: Thêm loading và empty state cho SelectContent

### MobileBatchForm.tsx

1. **Line 74**: Thêm `.eq('tenant_id', tenantId)` vào query categories
2. **Line 541-558**: Thêm empty state cho item sheet

---

## KẾT QUẢ MONG ĐỢI

1. Query categories chỉ lấy đúng categories của tenant hiện tại
2. Hiển thị thông báo rõ ràng khi không có items
3. Hiển thị loading state khi đang tải dữ liệu
4. User có thể chọn item bình thường sau khi có đủ data

