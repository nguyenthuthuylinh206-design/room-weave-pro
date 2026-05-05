-- B-Test 1: Linen Pool Bridge — kho không bị trừ 2 lần
-- Gọi atomic_item_to_laundry → quantity_in_stock KHÔNG đổi.
-- Tạo laundry_batch_items → trigger sole-source trừ stock đúng 1 lần.
-- (Chạy thủ công trong môi trường test với fixture.)

DO $$
DECLARE _stock_before int; _stock_after int;
BEGIN
  -- Giả định: có 1 item linen test với quantity_in_stock = 100
  -- Replace UUID khi chạy thực tế
  RAISE NOTICE 'Test stub — implement with fixtures';
END $$;
