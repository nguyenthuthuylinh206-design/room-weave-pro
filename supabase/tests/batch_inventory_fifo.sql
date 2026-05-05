-- B-Test 2: batch_inventory FIFO
-- 1. create_new_linen_batch tạo lô wash_cycles=0
-- 2. allocate_linen_fifo ưu tiên received_at cũ nhất
-- 3. Lô retired_at IS NOT NULL không được allocate
DO $$ BEGIN RAISE NOTICE 'FIFO test stub'; END $$;
