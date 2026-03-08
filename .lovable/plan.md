

## Tạo danh mục Minibar với item mẫu

Đây là thao tác **insert dữ liệu**, không thay đổi schema. Sẽ dùng insert tool để tạo dữ liệu cho **tất cả tenant đang hoạt động**.

### Vấn đề
Cần biết tạo cho tenant/hotel nào. Vì mỗi tenant có hotel riêng, sẽ tạo cho **từng cặp tenant + hotel** đang có trong hệ thống (dựa trên categories hiện có).

### Dữ liệu sẽ tạo

**1. Danh mục "Minibar"** cho mỗi hotel:
- `name`: Minibar
- `name_en`: Minibar
- `code`: MINIBAR
- `icon`: 🍺
- `color`: #F59E0B
- `default_item_type`: consumable
- `status`: active

**2. Items mẫu** (cho mỗi hotel, gắn vào category Minibar vừa tạo):

| Tên | Tên EN | Đơn vị | Giá nhập | Giá bán | Miễn phí? | Tồn kho |
|---|---|---|---|---|---|---|
| Coca Cola | Coca Cola | lon | 8,000 | 15,000 | ❌ Tính phí | 50 |
| Pepsi | Pepsi | lon | 8,000 | 15,000 | ❌ Tính phí | 50 |
| Nước suối Aquafina | Aquafina Water | chai | 5,000 | 10,000 | ✅ Miễn phí | 100 |
| Bia Tiger | Tiger Beer | lon | 12,000 | 25,000 | ❌ Tính phí | 30 |
| Bia Heineken | Heineken Beer | lon | 15,000 | 30,000 | ❌ Tính phí | 30 |
| Snack Oishi | Oishi Snack | gói | 10,000 | 20,000 | ❌ Tính phí | 40 |
| Socola Kitkat | Kitkat Chocolate | thanh | 12,000 | 22,000 | ❌ Tính phí | 30 |
| Nước cam ép | Orange Juice | chai | 15,000 | 30,000 | ❌ Tính phí | 20 |
| Hoa quả tổng hợp | Mixed Fruits | phần | 30,000 | 50,000 | ❌ Tính phí | 10 |
| Trà túi lọc | Tea Bags | gói | 3,000 | 0 | ✅ Miễn phí | 100 |
| Cà phê gói | Instant Coffee | gói | 5,000 | 0 | ✅ Miễn phí | 100 |

Tất cả items sẽ có:
- `item_type`: consumable
- `is_chargeable`: true (trừ nước suối, trà, cà phê)
- `charge_price`: giá bán lẻ cho khách
- `is_complimentary`: true cho items miễn phí
- `status`: active
- `minimum_stock`: 10

### Cách thực hiện
1. Query tất cả tenant + hotel đang có categories
2. Insert 1 category "Minibar" per hotel
3. Insert 11 items per hotel gắn vào category đó
4. Code gen unique `code` cho mỗi item

Không cần thay đổi code frontend — tab Items hiện tại đã hiển thị đúng `is_chargeable` và `charge_price`.

