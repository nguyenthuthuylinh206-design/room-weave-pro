-- B-Test 3: Validation trigger cho room_checks
-- 1. quantity <= 0 → reject 'invalid_quantity'
-- 2. issue_role NULL → reject 'missing_issue_role'
-- 3. issue_role hợp lệ + quantity > 0 → pass
DO $$ BEGIN RAISE NOTICE 'Validation test stub'; END $$;
