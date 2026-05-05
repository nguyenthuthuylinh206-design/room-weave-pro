-- B-Test 1: Linen Pool Bridge — kho không bị trừ 2 lần
-- Mục tiêu:
--   1. atomic_item_to_laundry KHÔNG đụng quantity_in_stock (đã chuyển thành no-op).
--   2. INSERT vào laundry_batch_items là điểm DUY NHẤT trừ stock & cộng quantity_in_laundry
--      (qua trigger laundry_batch_items_inventory_trigger).
-- Chạy: psql -v ON_ERROR_STOP=1 -f supabase/tests/linen_pool_bridge.sql
-- An toàn: toàn bộ chạy trong transaction và ROLLBACK ở cuối.

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  v_item   record;
  v_tenant uuid;
  v_hotel  uuid;
  v_batch  uuid;
  v_stock0 int;
  v_laund0 int;
  v_stock1 int;
  v_laund1 int;
  v_stock2 int;
  v_laund2 int;
BEGIN
  -- Pick any item with enough stock for test
  SELECT id, tenant_id, hotel_id, quantity_in_stock, quantity_in_laundry
    INTO v_item
  FROM items
  WHERE quantity_in_stock >= 20
  ORDER BY created_at
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: no item with stock >= 20';
  END IF;

  v_tenant := v_item.tenant_id;
  v_hotel  := v_item.hotel_id;
  v_stock0 := v_item.quantity_in_stock;
  v_laund0 := COALESCE(v_item.quantity_in_laundry, 0);

  RAISE NOTICE '[setup] item=% stock0=% laundry0=%', v_item.id, v_stock0, v_laund0;

  -- Step 1: gọi atomic_item_to_laundry — phải KHÔNG đổi stock
  PERFORM public.atomic_item_to_laundry(v_item.id, 5);

  SELECT quantity_in_stock, COALESCE(quantity_in_laundry,0)
    INTO v_stock1, v_laund1
  FROM items WHERE id = v_item.id;

  IF v_stock1 <> v_stock0 OR v_laund1 <> v_laund0 THEN
    RAISE EXCEPTION 'FAIL [bridge-1]: atomic_item_to_laundry must be no-op. stock %->%, laundry %->%',
      v_stock0, v_stock1, v_laund0, v_laund1;
  END IF;
  RAISE NOTICE 'PASS [bridge-1] atomic_item_to_laundry no-op';

  -- Step 2: tạo batch + batch_item — trigger sẽ trừ stock 1 lần
  INSERT INTO laundry_batches(tenant_id, hotel_id, batch_code, total_items, total_weight_kg, status)
  VALUES (v_tenant, v_hotel, 'TEST-BRIDGE-' || gen_random_uuid()::text, 5, 1.0, 'delivered')
  RETURNING id INTO v_batch;

  INSERT INTO laundry_batch_items(batch_id, item_id, quantity_delivered)
  VALUES (v_batch, v_item.id, 5);

  SELECT quantity_in_stock, COALESCE(quantity_in_laundry,0)
    INTO v_stock2, v_laund2
  FROM items WHERE id = v_item.id;

  IF v_stock2 <> v_stock1 - 5 THEN
    RAISE EXCEPTION 'FAIL [bridge-2]: stock should drop by 5 (was %, expected %, got %)',
      v_stock1, v_stock1 - 5, v_stock2;
  END IF;
  IF v_laund2 <> v_laund1 + 5 THEN
    RAISE EXCEPTION 'FAIL [bridge-3]: laundry should rise by 5 (was %, expected %, got %)',
      v_laund1, v_laund1 + 5, v_laund2;
  END IF;
  RAISE NOTICE 'PASS [bridge-2/3] trigger trừ stock & cộng laundry đúng 1 lần (stock %, laundry %)', v_stock2, v_laund2;

  RAISE NOTICE '✅ ALL linen_pool_bridge tests PASSED';
END $$;

ROLLBACK;
