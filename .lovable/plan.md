

## Báo cáo phân tích lỗi: Lưu hành động & Nút hoàn thành không hoạt động

### Nguyên nhân gốc đã xác định

Sau khi phân tích code và database, tôi phát hiện **3 vấn đề chính**:

---

### 1. Laundry/Supplement Requests không được tạo (Lỗi logic mới thêm)

**Bằng chứng từ database:**
- `room_checks` có nhiều entries với `items_sent_to_laundry` và `items_consumed`
- `laundry_requests` và `supplement_requests` đều **trống hoàn toàn** (0 records)

**Nguyên nhân:** Code mới vừa được thêm vào `processDailyCheck` để tạo laundry/supplement requests, nhưng có thể:
- Code chưa được deploy hoàn toàn
- Hoặc lỗi trong việc gọi các hàm async (không await)
- Hoặc điều kiện `tenantId && userId && checkId` không thỏa mãn

**Giải pháp:** Thêm logging chi tiết để debug + đảm bảo các biến đều có giá trị

---

### 2. Auto-save chỉ lưu vào localStorage, không lưu vào database

**Hiện trạng:**
- `RoomCheckPage.tsx` sử dụng `form.watch()` để tự động lưu vào `localStorage` (dòng 372-388)
- Điều này có nghĩa là các hành động như "Gửi giặt", "Đánh dấu hết" được lưu **tạm thời** trong trình duyệt
- Chỉ khi nhấn **"Hoàn thành"** thì dữ liệu mới được lưu vào database

**Vấn đề tiềm năng:**
- Nếu user đóng tab/trình duyệt trước khi bấm "Hoàn thành", dữ liệu sẽ mất (sau 1 giờ localStorage tự xóa)
- User có thể hiểu nhầm rằng các thao tác đã được "lưu" vào hệ thống

---

### 3. Nút "Hoàn thành" không hoạt động - Tiềm năng

**Phân tích flow:**

```text
Nút "Hoàn thành" (dòng 989-1014)
    ↓
form.trigger() - validate form
    ↓
Nếu valid → setShowSubmitDialog(true) hoặc setShowCheckinBlockDialog(true)
    ↓
AlertDialogAction onClick={form.handleSubmit(onSubmit)}
    ↓
onSubmit() gọi createCheck.mutateAsync()
```

**Các điểm có thể gây lỗi:**

| Vị trí | Vấn đề tiềm năng | Khả năng |
|--------|------------------|----------|
| `form.trigger()` | Validation fail do schema | Trung bình |
| `setShowSubmitDialog(true)` | Dialog không hiện lên | Thấp |
| `createCheck.isPending` | Guard chặn double-submit quá sớm | Thấp |
| `onSubmit()` | Error trong async operations | Cao |

**Vấn đề chính:** Nếu có lỗi trong `onSubmit()`, dialog đóng ngay lập tức (dòng 554) nhưng không có UI feedback cho user. User sẽ nghĩ "không có gì xảy ra".

---

### Kế hoạch sửa lỗi

#### Bước 1: Thêm logging chi tiết vào `processDailyCheck`

**File:** `src/hooks/useRoomChecks.ts`

Thêm console.log để debug tại sao requests không được tạo:

```typescript
// 4. Auto-create laundry request nếu có đồ gửi giặt
const hasLaundry = laundryItems.length > 0
console.log('[processDailyCheck] Laundry check:', { 
  hasLaundry, 
  tenantId: !!tenantId, 
  userId: !!userId, 
  checkId: !!checkId,
  laundryItemsCount: laundryItems.length 
})

if (hasLaundry && tenantId && userId && checkId) {
  console.log('[processDailyCheck] Creating laundry request...')
  await createLaundryRequestFromCheck({...})
  console.log('[processDailyCheck] Laundry request created')
}
```

#### Bước 2: Sửa lỗi trong `createLaundryRequestFromCheck` và `createSupplementRequestFromCheck`

**Vấn đề tiềm năng:** Các hàm này có thể throw error nhưng không được catch đúng cách.

Thêm try-catch wrapper:

```typescript
// 4. Auto-create laundry request nếu có đồ gửi giặt
if (hasLaundry && tenantId && userId && checkId) {
  try {
    await createLaundryRequestFromCheck({...})
  } catch (err) {
    console.error('[processDailyCheck] Failed to create laundry request:', err)
    // Không throw - cho phép room check vẫn thành công
  }
}
```

#### Bước 3: Cải thiện feedback UI cho nút "Hoàn thành"

**File:** `src/pages/rooms/RoomCheckPage.tsx`

**Thay đổi 1:** Thêm error handling trong `onSubmit` với toast thông báo

```typescript
} catch (error) {
  console.error('Error creating room check:', error)
  
  // Thêm toast cho user biết có lỗi
  toast({
    title: 'Lỗi',
    description: error instanceof Error ? error.message : 'Không thể hoàn thành kiểm tra. Vui lòng thử lại.',
    variant: 'destructive',
  })
}
```

**Thay đổi 2:** Không đóng dialog ngay lập tức, đợi mutation thành công

```typescript
const onSubmit = async (data: RoomCheckFormData) => {
  if (!id || !user?.id || createCheck.isPending) return
  
  // THAY ĐỔI: Không đóng dialog ngay - đợi mutation xong
  // setShowSubmitDialog(false) // BỎ DÒNG NÀY
  
  try {
    // ... existing code ...
    
    // Đóng dialog SAU KHI thành công
    setShowSubmitDialog(false)
    
    // ... rest of success handling ...
  } catch (error) {
    // Giữ dialog mở để user có thể thử lại
    console.error('Error creating room check:', error)
    toast({
      title: 'Lỗi',
      description: error instanceof Error ? error.message : 'Không thể hoàn thành kiểm tra',
      variant: 'destructive',
    })
  }
}
```

#### Bước 4: Thêm loading indicator rõ ràng hơn

**File:** `src/pages/rooms/RoomCheckPage.tsx`

Thêm state để track submission:

```typescript
const [isSubmitting, setIsSubmitting] = useState(false)

const onSubmit = async (data: RoomCheckFormData) => {
  if (!id || !user?.id || createCheck.isPending || isSubmitting) return
  
  setIsSubmitting(true)
  
  try {
    // ... existing code ...
  } catch (error) {
    // ... error handling ...
  } finally {
    setIsSubmitting(false)
  }
}
```

---

### Thứ tự triển khai

| # | File | Thay đổi | Ước tính |
|---|------|----------|----------|
| 1 | `useRoomChecks.ts` | Thêm logging + try-catch trong `processDailyCheck` | 5 phút |
| 2 | `RoomCheckPage.tsx` | Sửa flow submit: không đóng dialog sớm, thêm isSubmitting state | 10 phút |
| 3 | `RoomCheckPage.tsx` | Cải thiện error handling với toast | 5 phút |
| 4 | Testing | Kiểm tra end-to-end daily check với đồ giặt | 10 phút |

---

### Lưu ý quan trọng

Hệ thống **auto-save** hiện tại:
- **CHỈ LƯU VÀO LOCALSTORAGE**, không lưu vào database
- Mục đích là để user có thể "tiếp tục" nếu đóng tab giữa chừng
- Để lưu vào database, user **BẮT BUỘC** phải bấm "Hoàn thành"

Nếu muốn thay đổi behavior này (auto-save thật sự vào database), cần tạo plan riêng vì đây là thay đổi lớn về architecture.

