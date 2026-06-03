// Liệt kê template từ provider (UI: nút "Tải template từ Viettel").
import { adminClient, corsHeaders, jsonResponse, loadConfig, makeProvider, persistCachedToken, requireUser } from '../_shared/einvoice/runtime.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);
  const user = await requireUser(req);
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'invalid_json' }, 400); }
  if (!body?.config_id) return jsonResponse({ error: 'missing_config_id' }, 400);

  const sb = adminClient();
  const cfg = await loadConfig(sb, body.config_id);
  if (!cfg) return jsonResponse({ error: 'config_not_found' }, 404);
  if (!cfg.api_password) return jsonResponse({ error: 'password_not_set' }, 400);

  try {
    const provider = await makeProvider(cfg, sb, null);
    const list = await provider.listTemplates();
    const ct = (provider as any).cachedToken;
    if (ct?.token) await persistCachedToken(sb, cfg.id, ct.token, ct.expiresAt);
    return jsonResponse({ ok: true, templates: list });
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e?.message || 'fetch_failed' }, 200);
  }
});
