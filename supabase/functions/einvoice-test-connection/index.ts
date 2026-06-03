// Test connection (login + optional listTemplates) cho Owner.
import { adminClient, corsHeaders, jsonResponse, loadConfig, makeProvider, requireUser, persistCachedToken } from '../_shared/einvoice/runtime.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const user = await requireUser(req);
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'invalid_json' }, 400); }
  const configId: string | undefined = body?.config_id;
  if (!configId) return jsonResponse({ error: 'missing_config_id' }, 400);

  const sb = adminClient();
  try {
    const cfg = await loadConfig(sb, configId);
    if (!cfg) return jsonResponse({ error: 'config_not_found' }, 404);
    if (!cfg.api_password) return jsonResponse({ error: 'password_not_set' }, 400);

    const provider = await makeProvider(cfg, sb, null);
    const result = await provider.testConnection();

    // Cache token nếu OK
    if (result.ok && (provider as any).cachedToken?.token) {
      const ct = (provider as any).cachedToken;
      await persistCachedToken(sb, cfg.id, ct.token, ct.expiresAt);
    }

    await sb.from('hotel_einvoice_configs').update({
      last_test_at: new Date().toISOString(),
      last_test_ok: result.ok,
      last_test_message: result.message,
    }).eq('id', cfg.id);

    return jsonResponse({ ok: result.ok, message: result.message });
  } catch (e: any) {
    console.error('test_connection_error', e);
    return jsonResponse({ ok: false, message: e?.message || 'internal_error' }, 200);
  }
});
