

## Ảnh hưởng của Đợt 2 đến logic & dữ liệu

### Trả lời ngắn
**Không thay đổi logic nghiệp vụ, không thay đổi dữ liệu lưu trong DB.** Chỉ thay đổi *cách* client lắng nghe và đồng bộ dữ liệu. Tuy nhiên có **3 điểm rủi ro hành vi** cần lưu ý.

---

### Những gì KHÔNG đổi
- Schema DB, RLS, RPC, edge functions: giữ nguyên
- Mọi `INSERT/UPDATE/DELETE` từ user thao tác: giữ nguyên
- Kết quả query (`useQuery` trả về data gì) sau khi load xong: giống hệt
- Logic checkin/checkout/payment/laundry/maintenance: không đụng

### Những gì ĐỔI (chỉ về timing & transport)
| Thay đổi | Trước | Sau |
|---|---|---|
| Filter realtime theo `tenant_id` | Một số channel nhận event của tenant khác (bug tiềm ẩn) | Chỉ nhận event đúng tenant → **dữ liệu chính xác hơn** |
| Bỏ `refetchInterval` | Tự refetch mỗi 30–60s | Chỉ refetch khi có realtime event hoặc user thao tác |
| Pause realtime khi tab ẩn | Luôn lắng nghe | Pause khi ẩn, resume + invalidate khi quay lại |
| Heartbeat staff_status | UPDATE DB mỗi 5 phút | Presence in-memory, không ghi DB |

---

### 3 rủi ro hành vi cần lưu ý

**1. Bỏ polling → phụ thuộc 100% vào realtime**
- Nếu một bảng *không* có realtime publication mà ta lỡ bỏ `refetchInterval` → data sẽ stale cho đến khi user thao tác.
- **Cách phòng**: trước khi bỏ polling cho mỗi hook, xác nhận bảng đó đã `ALTER PUBLICATION supabase_realtime ADD TABLE`. Nếu chưa có → giữ polling hoặc thêm publication.

**2. Pause khi tab ẩn → có thể bỏ lỡ event lúc ẩn**
- Khi user mở lại tab, channel resubscribe nhưng các event xảy ra lúc ẩn đã mất.
- **Cách phòng**: lúc resume luôn `queryClient.invalidateQueries()` cho các key liên quan → fetch snapshot mới → dữ liệu vẫn đúng, chỉ trễ 1 lần fetch.

**3. Heartbeat → Presence**
- `staff_status.last_seen_at` trong DB sẽ **không còn được cập nhật mỗi 5 phút**.
- Nơi nào đang đọc `last_seen_at` từ DB để tính online/offline (ví dụ báo cáo lịch sử, query SQL ngoài app) sẽ thấy giá trị cũ.
- **Cách phòng**: 
  - UI online/offline đọc từ presence state (real-time, chính xác hơn).
  - Nếu cần lưu lịch sử online → vẫn UPDATE `last_seen_at` nhưng giãn ra 15 phút/lần, hoặc chỉ ghi khi user vào/ra shift.
  - Logic shift (`shift_start_at`, `shift_end_at`) **giữ nguyên ghi DB** như cũ — không đụng.

---

### Kết quả dữ liệu sau Đợt 2
- **Chính xác hơn** ở các channel hiện đang thiếu filter `tenant_id` (đang có nguy cơ nhận chéo event giữa tenant).
- **Tươi như cũ** với các bảng đã có realtime publication.
- **Trễ tối đa 1 fetch** khi user vừa mở lại tab sau thời gian dài → tự động đồng bộ.
- **Heartbeat trong DB không còn realtime** → cần chấp nhận hoặc thêm phương án ghi định kỳ nhẹ hơn.

### Đề xuất an toàn
Trước khi gỡ `refetchInterval` từng hook, mình sẽ:
1. Check bảng đã enable realtime chưa (qua `supabase_realtime` publication).
2. Nếu chưa → tạo migration `ALTER PUBLICATION` trước.
3. Mới gỡ polling.

Cách này đảm bảo **không có bảng nào mất khả năng cập nhật** sau refactor.

