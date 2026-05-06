-- =============================================================================
-- Test suite: reorder_suggestions (Inventory Intelligence C1)
-- Mục tiêu: Verify trigger realtime + RPC compute/approve/ignore hoạt động đúng
-- Chạy: psql -f supabase/tests/reorder_suggestions.sql
-- An toàn: Toàn bộ chạy trong 1 transaction, ROLLBACK ở cuối → không ảnh hưởng dữ liệu prod
-- =============================================================================

BEGIN;

-- Helper assertion (sẽ ROLLBACK cùng transaction)
CREATE OR REPLACE FUNCTION pg_temp.assert_eq(_label text, _actual text, _expected text)
RETURNS int LANGUAGE plpgsql AS $$
BEGIN
  IF _actual IS NOT DISTINCT FROM _expected THEN
    RAISE NOTICE '  ✅ % | got=%', _label, _actual;
    RETURN 1;
  ELSE
    RAISE WARNING '  ❌ % | expected=% got=%', _label, _expected, _actual;
    RETURN 0;
  END IF;
END;
$$;

DO $TEST$
DECLARE
  v_tenant_id  uuid;
  v_hotel_id   uuid;
  v_user_id    uuid;
  v_vendor_id  uuid;
  v_cat_id     uuid;
  v_item_a     uuid;  -- below reorder_point → expect suggestion
  v_item_b     uuid;  -- above reorder_point → expect NO suggestion
  v_item_c     uuid;  -- no reorder_point set → expect NO suggestion
  v_item_d     uuid;  -- below + no preferred_vendor → fallback group
  v_sugg_id    uuid;
  v_sugg_a     uuid;
  v_sugg_d     uuid;
  v_po_id      uuid;
  v_count      int;
  v_result     jsonb;
  v_failed     int := 0;
  v_passed     int := 0;

  PROCEDURE assert_eq(_label text, _actual anyelement, _expected anyelement) AS $$
  BEGIN
    IF _actual IS NOT DISTINCT FROM _expected THEN
      v_passed := v_passed + 1;
      RAISE NOTICE '  ✅ % | got=%', _label, _actual;
    ELSE
      v_failed := v_failed + 1;
      RAISE WARNING '  ❌ % | expected=% got=%', _label, _expected, _actual;
    END IF;
  END;
  $$ LANGUAGE plpgsql;

BEGIN
  -- ───────────────────────────────────────────────────────────────────────────
  -- SETUP: pick a real tenant/hotel để có FK hợp lệ; tạo user fake để bypass auth
  -- ───────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_tenant_id FROM public.tenants ORDER BY created_at LIMIT 1;
  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'NO_TENANT_FOUND — cần ít nhất 1 tenant trong DB'; END IF;

  SELECT id INTO v_hotel_id FROM public.hotels WHERE tenant_id = v_tenant_id LIMIT 1;
  IF v_hotel_id IS NULL THEN RAISE EXCEPTION 'NO_HOTEL_FOUND cho tenant %', v_tenant_id; END IF;

  -- Fake auth user để pass permission check trong approve/ignore
  v_user_id := gen_random_uuid();
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', v_user_id::text, 'role', 'authenticated')::text, true);

  -- Cấp role hotel_manager để qua forbidden_approve
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'hotel_manager'::app_role);

  -- Vendor
  INSERT INTO public.vendors (tenant_id, name, code)
  VALUES (v_tenant_id, 'TEST Vendor Reorder', 'TEST-V-RO-' || substr(gen_random_uuid()::text, 1, 8))
  RETURNING id INTO v_vendor_id;

  -- Category (nếu cần)
  SELECT id INTO v_cat_id FROM public.item_categories WHERE tenant_id = v_tenant_id LIMIT 1;

  -- Items
  INSERT INTO public.items (tenant_id, hotel_id, category_id, name, unit, unit_price,
                            quantity_in_stock, quantity_total, minimum_stock,
                            reorder_point, reorder_max_qty, preferred_vendor_id, status)
  VALUES (v_tenant_id, v_hotel_id, v_cat_id, 'TEST_RO_A_below', 'cái', 10000,
          5, 5, 3, 10, 50, v_vendor_id, 'active')
  RETURNING id INTO v_item_a;

  INSERT INTO public.items (tenant_id, hotel_id, category_id, name, unit, unit_price,
                            quantity_in_stock, quantity_total, minimum_stock,
                            reorder_point, reorder_max_qty, preferred_vendor_id, status)
  VALUES (v_tenant_id, v_hotel_id, v_cat_id, 'TEST_RO_B_above', 'cái', 10000,
          100, 100, 3, 10, 50, v_vendor_id, 'active')
  RETURNING id INTO v_item_b;

  INSERT INTO public.items (tenant_id, hotel_id, category_id, name, unit, unit_price,
                            quantity_in_stock, quantity_total, minimum_stock,
                            reorder_point, status)
  VALUES (v_tenant_id, v_hotel_id, v_cat_id, 'TEST_RO_C_no_threshold', 'cái', 10000,
          0, 0, 0, 0, 'active')
  RETURNING id INTO v_item_c;

  INSERT INTO public.items (tenant_id, hotel_id, category_id, name, unit, unit_price,
                            quantity_in_stock, quantity_total, minimum_stock,
                            reorder_point, reorder_max_qty, status)
  VALUES (v_tenant_id, v_hotel_id, v_cat_id, 'TEST_RO_D_no_vendor', 'cái', 8000,
          2, 2, 1, 5, 20, 'active')
  RETURNING id INTO v_item_d;

  RAISE NOTICE '────────────────────────────────────────────────────────────';
  RAISE NOTICE 'SETUP done: tenant=% hotel=% items=A/B/C/D', v_tenant_id, v_hotel_id;
  RAISE NOTICE '────────────────────────────────────────────────────────────';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 1: compute_reorder_suggestions tạo đúng 2 đề xuất (A, D); skip B, C
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 1 — compute tạo đúng đề xuất cho item dưới ngưỡng';
  v_result := public.compute_reorder_suggestions(v_tenant_id, v_hotel_id);
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  created = 2 (A và D)', ((v_result->>'created')::int)::text, (2)::text);

  SELECT count(*) INTO v_count FROM public.reorder_suggestions
   WHERE tenant_id = v_tenant_id AND item_id IN (v_item_a, v_item_d) AND status = 'pending';
  CALL assert_eq('  có 2 row pending cho A,D', v_count, 2);

  SELECT count(*) INTO v_count FROM public.reorder_suggestions
   WHERE item_id IN (v_item_b, v_item_c);
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  không tạo cho B (đủ stock) và C (no threshold)', (v_count)::text, (0)::text);

  -- Verify suggested_qty = max(reorder_max_qty, reorder_point*2) - effective_stock
  -- Item A: max(50, 10*2)=50, effective=5, suggested=45
  SELECT suggested_qty INTO v_count FROM public.reorder_suggestions WHERE item_id = v_item_a;
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  item A suggested_qty = 45', (v_count)::text, (45)::text);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 2: idempotent — gọi lại compute không tạo trùng (unique partial index)
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 2 — compute idempotent (không tạo trùng)';
  v_result := public.compute_reorder_suggestions(v_tenant_id, v_hotel_id);
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  created = 0 (đã có pending)', ((v_result->>'created')::int)::text, (0)::text);
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  skipped = 2', ((v_result->>'skipped')::int)::text, (2)::text);

  SELECT count(*) INTO v_count FROM public.reorder_suggestions
   WHERE item_id IN (v_item_a, v_item_d) AND status = 'pending';
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  vẫn chỉ có 2 row pending (no duplicate)', (v_count)::text, (2)::text);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 3: realtime trigger — INSERT inventory_transactions kiểu 'out' tự sinh
  --        suggestion + cập nhật last_outbound_at
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 3 — trigger realtime trên outbound transaction';

  -- Đẩy item B xuống dưới ngưỡng bằng 1 outbound → kỳ vọng trigger sinh suggestion
  UPDATE public.items SET quantity_in_stock = 8 WHERE id = v_item_b;  -- 8 < reorder_point 10

  INSERT INTO public.inventory_transactions
    (tenant_id, hotel_id, item_id, transaction_type, transaction_category,
     quantity, unit_price, total_value, quantity_before, quantity_after,
     transaction_code, created_by, transaction_date)
  VALUES
    (v_tenant_id, v_hotel_id, v_item_b, 'out', 'consume',
     2, 10000, 20000, 10, 8,
     'TEST-OUT-' || substr(gen_random_uuid()::text, 1, 8), v_user_id, now());

  SELECT count(*) INTO v_count FROM public.reorder_suggestions
   WHERE item_id = v_item_b AND status = 'pending';
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  trigger sinh suggestion cho B sau outbound', (v_count)::text, (1)::text);

  -- last_outbound_at được cập nhật
  PERFORM 1 FROM public.items WHERE id = v_item_b AND last_outbound_at IS NOT NULL;
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  last_outbound_at đã set cho B', (FOUND)::text, (true)::text);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 4: ignore_reorder_suggestion → status='ignored' + ignored_until tương lai
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 4 — ignore suggestion với ignore_days=14';
  SELECT id INTO v_sugg_a FROM public.reorder_suggestions
   WHERE item_id = v_item_a AND status = 'pending';

  v_result := public.ignore_reorder_suggestion(v_sugg_a, 'Đang chờ giá tốt hơn', 14);
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  ok = true', ((v_result->>'ok')::boolean)::text, (true)::text);

  SELECT status INTO v_count FROM (
    SELECT CASE status WHEN 'ignored' THEN 1 ELSE 0 END AS status
    FROM public.reorder_suggestions WHERE id = v_sugg_a
  ) x;
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  status = ignored', (v_count)::text, (1)::text);

  PERFORM 1 FROM public.reorder_suggestions
   WHERE id = v_sugg_a AND ignored_until = CURRENT_DATE + 14 AND ignored_reason = 'Đang chờ giá tốt hơn';
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  ignored_until = today+14 và reason đúng', (FOUND)::text, (true)::text);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 5: compute respect ignored_until → KHÔNG sinh lại suggestion cho A
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 5 — compute tôn trọng ignored_until';
  v_result := public.compute_reorder_suggestions(v_tenant_id, v_hotel_id, v_item_a);
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  created = 0 cho item A đang bị ignore', ((v_result->>'created')::int)::text, (0)::text);

  SELECT count(*) INTO v_count FROM public.reorder_suggestions
   WHERE item_id = v_item_a AND status = 'pending';
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  không có pending mới cho A', (v_count)::text, (0)::text);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 6: approve_reorder_suggestions — gom theo (hotel, vendor) → tạo PO draft
  --   - Item D không có preferred_vendor → 1 PO riêng (vendor NULL)
  --   - Item B có vendor v_vendor_id → 1 PO riêng
  --   → kỳ vọng 2 PO
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 6 — approve gom theo vendor → tạo PO draft';
  SELECT id INTO v_sugg_d FROM public.reorder_suggestions
   WHERE item_id = v_item_d AND status = 'pending';
  SELECT id INTO v_sugg_id FROM public.reorder_suggestions
   WHERE item_id = v_item_b AND status = 'pending';

  v_result := public.approve_reorder_suggestions(ARRAY[v_sugg_d, v_sugg_id]);
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  converted_count = 2', ((v_result->>'converted_count')::int)::text, (2)::text);
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  tạo 2 PO (1 vendor + 1 NULL)', (jsonb_array_length(v_result->'po_ids'))::text, (2)::text);

  SELECT count(*) INTO v_count FROM public.reorder_suggestions
   WHERE id IN (v_sugg_d, v_sugg_id) AND status = 'converted' AND converted_po_id IS NOT NULL;
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  2 suggestion đã chuyển status=converted + có po_id', (v_count)::text, (2)::text);

  SELECT count(*) INTO v_count FROM public.purchase_orders
   WHERE id::text IN (
     SELECT jsonb_array_elements_text(v_result->'po_ids')
   ) AND status = 'draft';
  v_total := v_total + 1; v_passed := v_passed + pg_temp.assert_eq('  cả 2 PO đều ở status=draft', (v_count)::text, (2)::text);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 7: permission & validation guard
  --   - approve khi không có pending nào trong array → no_pending_suggestions
  --   - approve khi user không có role → forbidden_approve
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '🧪 TEST 7 — guards: no_pending_suggestions + forbidden_approve';

  BEGIN
    PERFORM public.approve_reorder_suggestions(ARRAY[v_sugg_d]); -- đã converted
    v_failed := v_failed + 1;
    RAISE WARNING '  ❌ kỳ vọng raise no_pending_suggestions, nhưng không raise';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%no_pending_suggestions%' THEN
      v_passed := v_passed + 1;
      RAISE NOTICE '  ✅ raise đúng "no_pending_suggestions"';
    ELSE
      v_failed := v_failed + 1;
      RAISE WARNING '  ❌ raise sai: %', SQLERRM;
    END IF;
  END;

  -- Bỏ role để test forbidden
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- Tạo 1 suggestion mới để có pending
  UPDATE public.items SET quantity_in_stock = 1 WHERE id = v_item_b;
  PERFORM public.compute_reorder_suggestions(v_tenant_id, v_hotel_id, v_item_b);
  SELECT id INTO v_sugg_id FROM public.reorder_suggestions
   WHERE item_id = v_item_b AND status = 'pending' LIMIT 1;

  BEGIN
    PERFORM public.approve_reorder_suggestions(ARRAY[v_sugg_id]);
    v_failed := v_failed + 1;
    RAISE WARNING '  ❌ kỳ vọng raise forbidden_approve, nhưng không raise';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%forbidden_approve%' THEN
      v_passed := v_passed + 1;
      RAISE NOTICE '  ✅ raise đúng "forbidden_approve" khi user không có role';
    ELSE
      v_failed := v_failed + 1;
      RAISE WARNING '  ❌ raise sai: %', SQLERRM;
    END IF;
  END;

  -- ───────────────────────────────────────────────────────────────────────────
  -- SUMMARY
  -- ───────────────────────────────────────────────────────────────────────────
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 KẾT QUẢ: % passed, % failed', v_passed, v_failed;
  RAISE NOTICE '════════════════════════════════════════════════════════════';

  IF v_failed > 0 THEN
    RAISE EXCEPTION 'TEST SUITE FAILED: % assertions failed', v_failed;
  END IF;
END;
$TEST$;

ROLLBACK;
