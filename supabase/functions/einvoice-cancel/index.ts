// Cancel invoice (chỉ Owner). Phase 1 wrapper.
import { adminClient, corsHeaders, jsonResponse, loadConfig, makeProvider, persistCachedToken, requireUser } from '../_shared/einvoice/runtime.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);
  const user = await requireUser(req);
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'invalid_json' }, 400); }
  const invoiceId: string | undefined = body?.invoice_id;
  const reason: string = (body?.reason || '').toString();
  if (!invoiceId || !reason) return jsonResponse({ error: 'missing_fields' }, 400);

  const sb = adminClient();
  const { data: inv } = await sb.from('hotel_invoices').select('*').eq('id', invoiceId).maybeSingle();
  if (!inv) return jsonResponse({ error: 'invoice_not_found' }, 404);
  if (!inv.invoice_no || !inv.template_code) return jsonResponse({ error: 'invoice_not_ready' }, 400);

  const cfg = await loadConfig(sb, inv.config_id);
  if (!cfg) return jsonResponse({ error: 'config_missing' }, 404);
  const provider = await makeProvider(cfg, sb, invoiceId);
  const res = await provider.cancelInvoice(inv.invoice_no, inv.template_code, reason);
  const ct = (provider as any).cachedToken;
  if (ct?.token) await persistCachedToken(sb, cfg.id, ct.token, ct.expiresAt);

  if (res.ok) {
    await sb.from('hotel_invoices').update({
      status: 'cancelled',
      viettel_status: 'CANCELLED',
      adjustment_reason: reason,
      provider_response: res.raw,
    }).eq('id', invoiceId);
  }
  return jsonResponse({ ok: res.ok, raw: res.raw });
});
