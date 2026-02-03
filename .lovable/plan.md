

## Kế hoạch: Quay về trang trước đó khi hủy kiểm tra phòng

### VẤN ĐỀ HIỆN TẠI

Trong hàm `confirmCancel` (dòng 675), logic điều hướng là:

```tsx
navigate(isManager ? `/rooms/${id}` : '/rooms')
```

- **Manager**: Luôn quay về `/rooms/${id}` (trang chi tiết phòng)
- **Staff**: Luôn quay về `/rooms` (danh sách phòng)

**Vấn đề**: Người dùng có thể vào trang kiểm tra từ nhiều nguồn khác nhau (danh sách phòng, chi tiết phòng, housekeeping tasks, distribution routes), nhưng luôn bị đưa về trang cố định.

---

### GIẢI PHÁP ĐỀ XUẤT

Lưu trang nguồn (referrer) khi vào RoomCheckPage và sử dụng nó khi hủy hoặc hoàn thành.

#### Phương án: Lưu referrer trong sessionStorage

| Bước | Mô tả |
|------|-------|
| 1 | Khi RoomCheckPage mount, lưu `location.pathname` trước đó vào sessionStorage |
| 2 | Khi hủy/hoàn thành, đọc referrer từ sessionStorage và navigate về đó |
| 3 | Fallback về `/rooms/${id}` nếu không có referrer |

---

### CHI TIẾT THAY ĐỔI

**File**: `src/pages/rooms/RoomCheckPage.tsx`

#### Thay đổi 1: Lưu referrer khi mount (thêm vào đầu component)

```tsx
// Thêm key cho sessionStorage
const REFERRER_KEY = `room-check-referrer-${id}`

// Trong useEffect khi mount
useEffect(() => {
  // Lưu trang referrer nếu chưa có (để tránh ghi đè khi refresh)
  if (!sessionStorage.getItem(REFERRER_KEY)) {
    // Lấy referrer từ document hoặc dùng default
    const referrer = document.referrer 
      ? new URL(document.referrer).pathname 
      : `/rooms/${id}`
    
    // Chỉ lưu nếu referrer không phải là chính trang check này
    if (!referrer.includes('/check')) {
      sessionStorage.setItem(REFERRER_KEY, referrer)
    }
  }
}, [id])
```

#### Thay đổi 2: Sử dụng referrer trong confirmCancel

```tsx
// TRƯỚC:
navigate(isManager ? `/rooms/${id}` : '/rooms')

// SAU:
const getReferrerPath = () => {
  const savedReferrer = sessionStorage.getItem(REFERRER_KEY)
  sessionStorage.removeItem(REFERRER_KEY) // Xóa sau khi sử dụng
  
  // Validate referrer (phải là internal path)
  if (savedReferrer && savedReferrer.startsWith('/')) {
    return savedReferrer
  }
  
  // Fallback: Manager về chi tiết phòng, Staff về danh sách
  return isManager ? `/rooms/${id}` : '/rooms'
}

// Trong confirmCancel:
navigate(getReferrerPath())
```

#### Thay đổi 3: Cũng áp dụng cho navigation sau khi hoàn thành check

Tìm các chỗ navigate sau khi hoàn thành và áp dụng logic tương tự.

---

### FLOW SAU KHI SỬA

```text
1. User từ /housekeeping → Click "Kiểm tra phòng" 
   → sessionStorage lưu "/housekeeping"
   → Vào RoomCheckPage

2. User bấm "Hủy và thoát"
   → Đọc referrer từ sessionStorage: "/housekeeping"
   → navigate("/housekeeping")
   → Xóa referrer khỏi sessionStorage

3. HOẶC: User từ /rooms/123 → Click "Kiểm tra"
   → sessionStorage lưu "/rooms/123"
   → Hủy → Quay về "/rooms/123"

4. HOẶC: User truy cập trực tiếp từ link/bookmark
   → Không có referrer
   → Fallback: Manager → /rooms/${id}, Staff → /rooms
```

---

### KẾT QUẢ MONG ĐỢI

| Nguồn truy cập | Trước | Sau |
|----------------|-------|-----|
| Từ trang chi tiết phòng | Manager: chi tiết, Staff: danh sách | ✅ Quay về chi tiết phòng |
| Từ danh sách phòng | Manager: chi tiết, Staff: danh sách | ✅ Quay về danh sách phòng |
| Từ housekeeping tasks | Manager: chi tiết, Staff: danh sách | ✅ Quay về housekeeping |
| Từ distribution route | Manager: chi tiết, Staff: danh sách | ✅ Quay về distribution |
| Truy cập trực tiếp | Như hiện tại | Fallback về chi tiết/danh sách |

---

### LƯU Ý

- Sử dụng `sessionStorage` thay vì `localStorage` để tự động xóa khi đóng tab
- Validate referrer để tránh redirect ra ngoài app
- Xóa referrer sau khi sử dụng để tránh behavior lạ khi quay lại trang check

