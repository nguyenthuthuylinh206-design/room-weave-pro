// Polling background: với mỗi invoice processing/queued/signing, gọi searchByTransactionUuid.
// Có thể gọi từ cron HOẶC từ UI (POST {invoice_id}) để poll on-demand.
import { adminClient, corsHeaders, jsonResponse, loadConfig, makeProvider, persistCachedToken } from '../_shared/einvoice/runtime.ts';

const MAX_BATCH = 20;
const MAX_ATTEMPTS = 30;

async function pollOne(sb: any, invId: string) {
  const { data: inv } = await sb.from('hotel_invoices').select('*').eq('id', invId).maybeSingle();
  if (!inv) return { id: invId, skipped: 'not_found' };
  if (!['queued','processing','signing'].includes(inv.status)) return { id: invId, skipped: 'final_state' };
  if (!inv.config_id) return { id: invId, skipped: 'no_config' };

  const cfg = await loadConfig(sb, inv.config_id);
  if (!cfg) return { id: invId, skipped: 'config_missing' };

  const provider = await makeProvider(cfg, sb, invId);
  const r = await provider.searchByTransactionUuid(inv.transaction_uuid);
  const ct = (provider as any).cachedToken;
  if (ct?.token) await persistCachedToken(sb, cfg.id, ct.token, ct.expiresAt);

  const updates: any = {
    last_polled_at: new Date().toISOString(),
    poll_attempts: (inv.poll_attempts || 0) + 1,
  };

  if (r.found) {
    if (r.invoiceNo) updates.invoice_no = r.invoiceNo;
    if (r.status === 'issued') {
      updates.status = 'issued';
      updates.viettel_status = 'RELEASED';
      if (!inv.issued_at) updates.issued_at = new Date().toISOString();
    } else if (r.status === 'cancelled') {
      updates.status = 'cancelled';
      updates.viettel_status = 'CANCELLED';
    } else {
      updates.viettel_status = 'PROCESSING';
    }
  } else if ((inv.poll_attempts || 0) + 1 >= MAX_ATTEMPTS) {
    updates.status = 'failed';
    updates.error_code = 'poll_timeout';
    updates.error_message = `Quá ${MAX_ATTEMPTS} lần thử, chưa có kết quả từ provider`;
  }

  await sb.from('hotel_invoices').update(updates).eq('id', invId);
  return { id: invId, status: updates.status || inv.status, viettel_status: updates.viettel_status };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const sb = adminClient();

  let body: any = {};
  if (req.method === 'POST') {
    try { body = await req.json(); } catch { body = {}; }
  }

  if (body?.invoice_id) {
    const res = await pollOne(sb, String(body.invoice_id));
    return jsonResponse({ ok: true, results: [res] });
  }

  // Batch mode (cron)
  const { data: list } = await sb
    .from('hotel_invoices')
    .select('id, poll_attempts, last_polled_at')
    .in('status', ['queued', 'processing', 'signing'])
    .order('last_polled_at', { ascending: true, nullsFirst: true })
    .limit(MAX_BATCH);

  const results: any[] = [];
  for (const r of list || []) {
    try { results.push(await pollOne(sb, r.id)); }
    catch (e: any) { results.push({ id: r.id, error: e?.message }); }
  }
  return jsonResponse({ ok: true, processed: results.length, results });
});
