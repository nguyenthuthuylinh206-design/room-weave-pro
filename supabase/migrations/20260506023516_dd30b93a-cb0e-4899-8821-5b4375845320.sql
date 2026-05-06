-- 1. Realtime messages RLS — only authenticated users can use broadcast/presence
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Tighten "WITH CHECK (true)" policies — restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert webhook logs" ON public.payment_webhook_logs;
CREATE POLICY "Service role can insert webhook logs"
ON public.payment_webhook_logs
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.in_app_notifications;
CREATE POLICY "Service role can insert notifications"
ON public.in_app_notifications
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert reminders" ON public.shift_reminders;
CREATE POLICY "Service can insert reminders"
ON public.shift_reminders
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "service role manages rate limit hits" ON public.rate_limit_hits;
CREATE POLICY "service role manages rate limit hits"
ON public.rate_limit_hits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Set search_path for 6 user functions to mitigate shadow-function attacks
ALTER FUNCTION public.fn_is_valid_room_transition(text, text) SET search_path = public;
ALTER FUNCTION public.fn_is_valid_task_transition(text, text) SET search_path = public;
ALTER FUNCTION public.fn_room_status_alias(text) SET search_path = public;
ALTER FUNCTION public.fn_sync_room_legacy_status() SET search_path = public;
ALTER FUNCTION public.fn_sync_room_legacy_status_ins() SET search_path = public;
ALTER FUNCTION public.perform_checkout(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, jsonb, numeric, date) SET search_path = public;