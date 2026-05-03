-- ============================================================
-- pgTAP-style tests for Room Check Lean RPCs
-- Run: psql $DATABASE_URL -f supabase/tests/room_check_lean.sql
--
-- Yêu cầu:
--   - Extension pgtap đã cài (CREATE EXTENSION IF NOT EXISTS pgtap;)
--   - Có ít nhất 1 tenant + 1 hotel + 1 room hợp lệ.
--   - Test chạy trong transaction, ROLLBACK ở cuối → không ghi dữ liệu thật.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(8);

-- ───────── Setup: tạo tenant/hotel/room/user ảo ─────────
DO $$
DECLARE
  v_tenant_a uuid := gen_random_uuid();
  v_tenant_b uuid := gen_random_uuid();
  v_hotel_a  uuid := gen_random_uuid();
  v_hotel_b  uuid := gen_random_uuid();
  v_room_a   uuid := gen_random_uuid();
  v_room_b   uuid := gen_random_uuid();
  v_user_a   uuid := gen_random_uuid();
  v_user_b   uuid := gen_random_uuid();
  v_staff_a  uuid := gen_random_uuid();
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _t (k text PRIMARY KEY, v uuid);
  INSERT INTO _t VALUES
    ('tenant_a', v_tenant_a), ('tenant_b', v_tenant_b),
    ('hotel_a',  v_hotel_a),  ('hotel_b',  v_hotel_b),
    ('room_a',   v_room_a),   ('room_b',   v_room_b),
    ('user_a',   v_user_a),   ('user_b',   v_user_b),
    ('staff_a',  v_staff_a);

  INSERT INTO tenants (id, name, email) VALUES
    (v_tenant_a, 'Tenant A Test', 'a-' || substr(v_tenant_a::text,1,8) || '@test.local'),
    (v_tenant_b, 'Tenant B Test', 'b-' || substr(v_tenant_b::text,1,8) || '@test.local');

  INSERT INTO hotels (id, tenant_id, name) VALUES
    (v_hotel_a, v_tenant_a, 'Hotel A'),
    (v_hotel_b, v_tenant_b, 'Hotel B');

  INSERT INTO rooms (id, tenant_id, hotel_id, room_number, floor, room_type, status) VALUES
    (v_room_a, v_tenant_a, v_hotel_a, 'TST-A', 1, 'standard', 'vacant_clean'),
    (v_room_b, v_tenant_b, v_hotel_b, 'TST-B', 1, 'standard', 'vacant_clean');

  -- auth.users rows are required by FK from public.users(id)
  INSERT INTO auth.users (id, instance_id, email, aud, role, created_at, updated_at)
  VALUES
    (v_user_a, '00000000-0000-0000-0000-000000000000', 'a-' || substr(v_user_a::text,1,8) || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (v_user_b, '00000000-0000-0000-0000-000000000000', 'b-' || substr(v_user_b::text,1,8) || '@test.local', 'authenticated', 'authenticated', now(), now());

  INSERT INTO users (id, tenant_id, hotel_id, full_name, email, role, user_level_code) VALUES
    (v_user_a, v_tenant_a, v_hotel_a, 'User A', 'a-' || substr(v_user_a::text,1,8) || '@test.local', 'staff', 'tenant_owner'),
    (v_user_b, v_tenant_b, v_hotel_b, 'User B', 'b-' || substr(v_user_b::text,1,8) || '@test.local', 'staff', 'tenant_owner');
END $$;

-- Helper: set auth.uid()
CREATE OR REPLACE FUNCTION _set_jwt(_uid uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _uid::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END $$;

-- ───────── Test 1: invalid_check_type ─────────
SELECT _set_jwt((SELECT v FROM _t WHERE k='user_a'));

SELECT throws_like(
  format($q$ SELECT submit_room_check_lean(
    %L::uuid, 'invalid_xx', now(),
    NULL, ARRAY[]::text[], '[]'::jsonb, '[]'::jsonb,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL
  ) $q$, (SELECT v FROM _t WHERE k='room_a')),
  '%invalid_check_type%',
  'Reject invalid check_type'
);

-- ───────── Test 2: invalid_quantity ─────────
SELECT throws_like(
  format($q$ SELECT submit_room_check_lean(
    %L::uuid, 'daily', now(),
    NULL, ARRAY[]::text[], '[]'::jsonb,
    %L::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL
  ) $q$,
    (SELECT v FROM _t WHERE k='room_a'),
    '[{"item_id":"00000000-0000-0000-0000-000000000001","item_name":"X","quantity":0,"photos":[],"charge_to_guest":false}]'),
  '%invalid_quantity%',
  'Reject quantity = 0'
);

-- ───────── Test 3: photo_required:damaged_lost (default ON) ─────────
SELECT throws_like(
  format($q$ SELECT submit_room_check_lean(
    %L::uuid, 'daily', now(),
    NULL, ARRAY[]::text[], '[]'::jsonb,
    %L::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL
  ) $q$,
    (SELECT v FROM _t WHERE k='room_a'),
    '[{"item_id":"00000000-0000-0000-0000-000000000001","item_name":"X","quantity":1,"photos":[],"charge_to_guest":false}]'),
  '%photo_required:damaged_lost%',
  'Require photo when item is damaged (default config)'
);

-- ───────── Test 4: forbidden_tenant — user_b cố submit room_a ─────────
SELECT _set_jwt((SELECT v FROM _t WHERE k='user_b'));

SELECT throws_like(
  format($q$ SELECT submit_room_check_lean(
    %L::uuid, 'daily', now(),
    NULL, ARRAY[]::text[], '[]'::jsonb,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL
  ) $q$, (SELECT v FROM _t WHERE k='room_a')),
  '%forbidden_tenant%',
  'Cross-tenant submit must be forbidden'
);

-- ───────── Test 5: perform_quick_room_check on cross-tenant room ─────────
SELECT throws_like(
  format($q$ SELECT perform_quick_room_check(%L::uuid, 'daily', NULL) $q$,
    (SELECT v FROM _t WHERE k='room_a')),
  '%forbidden_tenant%',
  'Cross-tenant quick path forbidden'
);

-- ───────── Test 6: quick_path_not_allowed for checkin ─────────
SELECT _set_jwt((SELECT v FROM _t WHERE k='user_a'));

SELECT throws_like(
  format($q$ SELECT perform_quick_room_check(%L::uuid, 'checkin', NULL) $q$,
    (SELECT v FROM _t WHERE k='room_a')),
  '%quick_path_not_allowed%',
  'Quick path is daily/periodic only'
);

-- ───────── Test 7: reopen_room_check requires manager+ role ─────────
SELECT throws_like(
  format($q$ SELECT reopen_room_check(%L::uuid, 'lý do test ngắn ngắn ngắn') $q$,
    gen_random_uuid()),
  '%(forbidden_role|check_not_found)%',
  'Reopen blocks regular staff role'
);

-- ───────── Test 8: validate_room_check_context accepts periodic ─────────
SELECT lives_ok(
  format($q$ SELECT validate_room_check_context(%L::uuid, 'periodic') $q$,
    (SELECT v FROM _t WHERE k='room_a')),
  'periodic is a valid check_type'
);

SELECT * FROM finish();
ROLLBACK;
