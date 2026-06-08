-- perform_checkout — server-authoritative finance test suite
-- Mục đích: chứng minh server tự tính lại vat_amount / service_fee_amount /
-- total_amount từ vat_rate + service_fee_rate lưu trong room_bookings, KHÔNG
-- tin tham số tài chính do client gửi (3 tham số cũ đã bị bỏ).
--
-- Chạy trong SQL editor của Lovable Cloud. Mỗi block tự setup + ROLLBACK.

-- ===========================================================
-- Helper: tạo booking checked_in + room occupied_clean tạm
-- ===========================================================
-- Mỗi DO block tự khai báo, không tạo function global để tránh ô nhiễm schema.

-- ===========================================================
-- 1) subtotal=0 → server vẫn ghi đúng (vat=0, sf=0, total=0)
-- ===========================================================
BEGIN;
DO $$
DECLARE
  _tenant uuid;
  _hotel uuid;
  _room uuid;
  _booking uuid;
  _vat numeric;
  _sf numeric;
  _total numeric;
  _subtotal numeric;
BEGIN
  SELECT t.id, h.id INTO _tenant, _hotel
  FROM public.tenants t
  JOIN public.hotels h ON h.tenant_id = t.id
  LIMIT 1;
  IF _tenant IS NULL OR _hotel IS NULL THEN
    RAISE EXCEPTION 'Cần ít nhất 1 tenant + 1 hotel để test';
  END IF;

  INSERT INTO public.rooms (tenant_id, hotel_id, room_number, room_type, status, floor)
  VALUES (_tenant, _hotel, 'TEST-PC-1', 'standard', 'occupied_clean', 1)
  RETURNING id INTO _room;

  INSERT INTO public.room_bookings (
    tenant_id, hotel_id, room_id, guest_name,
    check_in_date, check_out_date, status,
    room_price, vat_rate, service_fee_rate,
    subtotal, vat_amount, service_fee_amount, total_amount,
    deposit_amount, amount_paid, payment_status, booking_type
  ) VALUES (
    _tenant, _hotel, _room, 'Test Guest',
    CURRENT_DATE - 1, CURRENT_DATE, 'checked_in',
    500000, 8, 5,
    500000, 40000, 25000, 565000,
    0, 0, 'pending', 'daily'
  ) RETURNING id INTO _booking;

  -- Gọi RPC với subtotal=0 (client cố tình khai 0đ)
  PERFORM public.perform_checkout(
    _booking, _room,
    0, 0, 0,  -- late=0, services=0, subtotal=0
    0, NULL, '[]'::jsonb,
    NULL, NULL
  );

  SELECT subtotal, vat_amount, service_fee_amount, total_amount
    INTO _subtotal, _vat, _sf, _total
  FROM public.room_bookings WHERE id = _booking;

  IF _subtotal <> 0 OR _vat <> 0 OR _sf <> 0 OR _total <> 0 THEN
    RAISE EXCEPTION 'subtotal=0 phải dẫn đến tất cả = 0 nhưng được (sub=%, vat=%, sf=%, total=%)',
      _subtotal, _vat, _sf, _total;
  END IF;

  RAISE NOTICE '✓ subtotal=0 → vat=0, sf=0, total=0';
END $$;
ROLLBACK;

-- ===========================================================
-- 2) Server tự tính: subtotal=1.000.000, vat_rate=8, sf_rate=5
--    → vat=80.000, sf=50.000, total=1.130.000
--    Dù client gửi vat/sf/total cũng KHÔNG còn tham số → server tính lại.
-- ===========================================================
BEGIN;
DO $$
DECLARE
  _tenant uuid;
  _hotel uuid;
  _room uuid;
  _booking uuid;
  _vat numeric;
  _sf numeric;
  _total numeric;
BEGIN
  SELECT t.id, h.id INTO _tenant, _hotel
  FROM public.tenants t JOIN public.hotels h ON h.tenant_id = t.id LIMIT 1;

  INSERT INTO public.rooms (tenant_id, hotel_id, room_number, room_type, status, floor)
  VALUES (_tenant, _hotel, 'TEST-PC-2', 'standard', 'occupied_clean', 1) RETURNING id INTO _room;

  INSERT INTO public.room_bookings (
    tenant_id, hotel_id, room_id, guest_name,
    check_in_date, check_out_date, status,
    room_price, vat_rate, service_fee_rate,
    subtotal, vat_amount, service_fee_amount, total_amount,
    deposit_amount, amount_paid, payment_status, booking_type
  ) VALUES (
    _tenant, _hotel, _room, 'Test Guest 2',
    CURRENT_DATE - 1, CURRENT_DATE, 'checked_in',
    1000000, 8, 5,
    0, 0, 0, 0,  -- giá trị cũ vô nghĩa
    0, 0, 'pending', 'daily'
  ) RETURNING id INTO _booking;

  PERFORM public.perform_checkout(
    _booking, _room,
    0, 0, 1000000,
    0, NULL, '[]'::jsonb,
    NULL, NULL
  );

  SELECT vat_amount, service_fee_amount, total_amount
    INTO _vat, _sf, _total
  FROM public.room_bookings WHERE id = _booking;

  IF _vat <> 80000 THEN
    RAISE EXCEPTION 'Expected vat=80000, got %', _vat;
  END IF;
  IF _sf <> 50000 THEN
    RAISE EXCEPTION 'Expected sf=50000, got %', _sf;
  END IF;
  IF _total <> 1130000 THEN
    RAISE EXCEPTION 'Expected total=1130000, got %', _total;
  END IF;

  RAISE NOTICE '✓ vat_rate/sf_rate từ booking được áp đúng (vat=80k, sf=50k, total=1.13M)';
END $$;
ROLLBACK;

-- ===========================================================
-- 3) vat_rate=0 và sf_rate=0 trong booking → server cho vat=0, sf=0
--    total = subtotal, kể cả khi subtotal lớn.
-- ===========================================================
BEGIN;
DO $$
DECLARE
  _tenant uuid; _hotel uuid; _room uuid; _booking uuid;
  _vat numeric; _sf numeric; _total numeric;
BEGIN
  SELECT t.id, h.id INTO _tenant, _hotel
  FROM public.tenants t JOIN public.hotels h ON h.tenant_id = t.id LIMIT 1;

  INSERT INTO public.rooms (tenant_id, hotel_id, room_number, room_type, status, floor)
  VALUES (_tenant, _hotel, 'TEST-PC-3', 'standard', 'occupied_clean', 1) RETURNING id INTO _room;

  INSERT INTO public.room_bookings (
    tenant_id, hotel_id, room_id, guest_name,
    check_in_date, check_out_date, status,
    room_price, vat_rate, service_fee_rate,
    subtotal, vat_amount, service_fee_amount, total_amount,
    deposit_amount, amount_paid, payment_status, booking_type
  ) VALUES (
    _tenant, _hotel, _room, 'Test Guest 3',
    CURRENT_DATE - 1, CURRENT_DATE, 'checked_in',
    2000000, 0, 0,
    0, 0, 0, 0,
    0, 0, 'pending', 'daily'
  ) RETURNING id INTO _booking;

  PERFORM public.perform_checkout(
    _booking, _room, 0, 0, 2000000, 0, NULL, '[]'::jsonb, NULL, NULL
  );

  SELECT vat_amount, service_fee_amount, total_amount
    INTO _vat, _sf, _total FROM public.room_bookings WHERE id = _booking;

  IF _vat <> 0 OR _sf <> 0 OR _total <> 2000000 THEN
    RAISE EXCEPTION 'Expected (0, 0, 2000000), got (%, %, %)', _vat, _sf, _total;
  END IF;

  RAISE NOTICE '✓ vat_rate=0 + sf_rate=0 → total = subtotal';
END $$;
ROLLBACK;

-- ===========================================================
-- 4) payment_status được tính lại theo total mới (server-side)
--    deposit + amount_paid >= total → 'paid'; >0 nhưng < total → 'partial'
-- ===========================================================
BEGIN;
DO $$
DECLARE
  _tenant uuid; _hotel uuid; _room uuid; _booking uuid;
  _status text; _total numeric;
BEGIN
  SELECT t.id, h.id INTO _tenant, _hotel
  FROM public.tenants t JOIN public.hotels h ON h.tenant_id = t.id LIMIT 1;

  INSERT INTO public.rooms (tenant_id, hotel_id, room_number, room_type, status, floor)
  VALUES (_tenant, _hotel, 'TEST-PC-4', 'standard', 'occupied_clean', 1) RETURNING id INTO _room;

  INSERT INTO public.room_bookings (
    tenant_id, hotel_id, room_id, guest_name,
    check_in_date, check_out_date, status,
    room_price, vat_rate, service_fee_rate,
    subtotal, vat_amount, service_fee_amount, total_amount,
    deposit_amount, amount_paid, payment_status, booking_type
  ) VALUES (
    _tenant, _hotel, _room, 'Test Guest 4',
    CURRENT_DATE - 1, CURRENT_DATE, 'checked_in',
    1000000, 10, 0,
    0, 0, 0, 0,
    500000, 0, 'partial', 'daily'  -- chỉ có deposit
  ) RETURNING id INTO _booking;

  -- subtotal=1.000.000, vat=100.000 → total=1.100.000; paid=500.000 → 'partial'
  PERFORM public.perform_checkout(
    _booking, _room, 0, 0, 1000000, 0, NULL, '[]'::jsonb, NULL, NULL
  );

  SELECT payment_status, total_amount INTO _status, _total
  FROM public.room_bookings WHERE id = _booking;

  IF _status <> 'partial' THEN
    RAISE EXCEPTION 'Expected partial (deposit 500k < total 1.1M), got %', _status;
  END IF;
  IF _total <> 1100000 THEN
    RAISE EXCEPTION 'Expected total=1.100.000, got %', _total;
  END IF;

  RAISE NOTICE '✓ payment_status được tính theo total server-side';
END $$;
ROLLBACK;

-- ===========================================================
-- 5) RPC reject booking không ở trạng thái checked_in
-- ===========================================================
BEGIN;
DO $$
DECLARE
  _tenant uuid; _hotel uuid; _room uuid; _booking uuid;
  _err_ok boolean := false;
BEGIN
  SELECT t.id, h.id INTO _tenant, _hotel
  FROM public.tenants t JOIN public.hotels h ON h.tenant_id = t.id LIMIT 1;

  INSERT INTO public.rooms (tenant_id, hotel_id, room_number, room_type, status, floor)
  VALUES (_tenant, _hotel, 'TEST-PC-5', 'standard', 'vacant_clean', 1) RETURNING id INTO _room;

  INSERT INTO public.room_bookings (
    tenant_id, hotel_id, room_id, guest_name,
    check_in_date, check_out_date, status,
    room_price, vat_rate, service_fee_rate,
    subtotal, vat_amount, service_fee_amount, total_amount,
    deposit_amount, amount_paid, payment_status, booking_type
  ) VALUES (
    _tenant, _hotel, _room, 'Test Guest 5',
    CURRENT_DATE - 1, CURRENT_DATE, 'confirmed',  -- chưa checked_in
    500000, 8, 5,
    0, 0, 0, 0,
    0, 0, 'pending', 'daily'
  ) RETURNING id INTO _booking;

  BEGIN
    PERFORM public.perform_checkout(
      _booking, _room, 0, 0, 500000, 0, NULL, '[]'::jsonb, NULL, NULL
    );
  EXCEPTION WHEN OTHERS THEN
    _err_ok := true;
  END;

  IF NOT _err_ok THEN
    RAISE EXCEPTION 'RPC phải raise lỗi cho booking không ở trạng thái checked_in';
  END IF;

  RAISE NOTICE '✓ RPC từ chối booking không ở trạng thái checked_in';
END $$;
ROLLBACK;
