// Async issue: tạo bản ghi hotel_invoices (status=processing) và gọi provider.
// KHÔNG block đợi PDF / signing. Polling cron sẽ hoàn tất phần còn lại.
import { adminClient, corsHeaders, jsonResponse, loadConfig, makeProvider, persistCachedToken, requireUser } from '../_shared/einvoice/runtime.ts';

interface IssueBody {
  config_id: string;
  source_table?: string;
  source_id?: string;
  buyer: any;
  lines: any[];
  payment_method?: string;
  note?: string;
  template_id?: string | null;
  invoice_type?: 'normal' | 'adjustment' | 'replacement';
  original_invoice_id?: string;        // hotel_invoices.id gốc
  adjustment_type?: 1 | 3 | 5;
  adjustment_reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const user = await requireUser(req);
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  let body: IssueBody;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'invalid_json' }, 400); }
  if (!body?.config_id || !body?.buyer?.name || !Array.isArray(body?.lines) || body.lines.length === 0) {
    return jsonResponse({ error: 'invalid_payload' }, 400);
  }

  const sb = adminClient();
  const cfg = await loadConfig(sb, body.config_id);
  if (!cfg) return jsonResponse({ error: 'config_not_found' }, 404);
  if (!cfg.is_active) return jsonResponse({ error: 'config_disabled' }, 400);
  if (!cfg.api_password) return jsonResponse({ error: 'password_not_set' }, 400);

  // Resolve template
  let templateCode = cfg.default_template_code;
  let invoiceSeries = cfg.default_invoice_series;
  let templateId = body.template_id ?? null;
  if (body.template_id) {
    const { data: t } = await sb.from('invoice_templates').select('*').eq('id', body.template_id).maybeSingle();
    if (t) { templateCode = t.template_code; invoiceSeries = t.invoice_series; templateId = t.id; }
  } else {
    // Lấy template default nếu có
    const { data: t } = await sb.from('invoice_templates')
      .select('*').eq('hotel_id', cfg.hotel_id).eq('provider', cfg.provider).eq('is_default', true).maybeSingle();
    if (t) { templateCode = t.template_code; invoiceSeries = t.invoice_series; templateId = t.id; }
  }
  if (!templateCode || !invoiceSeries) return jsonResponse({ error: 'template_not_configured' }, 400);

  // Parent (adjustment / replacement)
  let parentInvoice: any = null;
  if (body.invoice_type && body.invoice_type !== 'normal') {
    if (!body.original_invoice_id) return jsonResponse({ error: 'original_invoice_required' }, 400);
    const { data: p } = await sb.from('hotel_invoices').select('*').eq('id', body.original_invoice_id).maybeSingle();
    if (!p) return jsonResponse({ error: 'original_invoice_not_found' }, 404);
    parentInvoice = p;
  }

  const txUuid = crypto.randomUUID();

  // Pre-create row (processing) → để client poll
  const subtotal = body.lines.reduce((s, l) => s + (l.quantity * l.unitPrice), 0);
  const vat = body.lines.reduce((s, l) => s + l.quantity * l.unitPrice * Math.max(l.vatPercentage, 0) / 100, 0);

  const { data: row, error: insErr } = await sb.from('hotel_invoices').insert({
    tenant_id: cfg.tenant_id,
    hotel_id: cfg.hotel_id,
    provider: cfg.provider,
    config_id: cfg.id,
    template_id: templateId,
    source_table: body.source_table ?? null,
    source_id: body.source_id ?? null,
    transaction_uuid: txUuid,
    invoice_type: body.invoice_type || 'normal',
    parent_invoice_id: parentInvoice?.id ?? null,
    original_invoice_no: parentInvoice?.invoice_no ?? null,
    original_transaction_uuid: parentInvoice?.transaction_uuid ?? null,
    adjustment_type: body.adjustment_type ?? null,
    adjustment_reason: body.adjustment_reason ?? null,
    template_code: templateCode,
    invoice_series: invoiceSeries,
    buyer: body.buyer,
    line_items: body.lines,
    subtotal,
    vat_amount: vat,
    total_amount: subtotal + vat,
    status: 'queued',
    created_by: user.id,
  }).select('id').single();
  if (insErr || !row) return jsonResponse({ error: 'create_row_failed', detail: insErr?.message }, 500);

  const provider = await makeProvider(cfg, sb, row.id);

  // Cập nhật → processing
  await sb.from('hotel_invoices').update({ status: 'processing' }).eq('id', row.id);

  let result;
  try {
    result = await provider.createInvoice({
      templateCode,
      invoiceSeries,
      buyer: body.buyer,
      lines: body.lines,
      paymentMethod: body.payment_method,
      note: body.note,
      transactionUuid: txUuid,
      invoiceType: body.invoice_type,
      adjustmentType: body.adjustment_type,
      originalInvoiceNo: parentInvoice?.invoice_no,
      originalTransactionUuid: parentInvoice?.transaction_uuid,
      adjustmentReason: body.adjustment_reason,
    });
  } catch (e: any) {
    await sb.from('hotel_invoices').update({
      status: 'failed',
      error_code: 'exception',
      error_message: e?.message?.slice(0, 500),
    }).eq('id', row.id);
    return jsonResponse({ ok: false, invoice_id: row.id, error: e?.message }, 200);
  }

  // Persist provider token cache
  const ct = (provider as any).cachedToken;
  if (ct?.token) await persistCachedToken(sb, cfg.id, ct.token, ct.expiresAt);

  const update: any = {
    provider_response: result.rawResponse,
    invoice_no: result.invoiceNo ?? null,
    reservation_code: result.reservationCode ?? null,
  };
  if (result.status === 'issued') {
    update.status = 'issued';
    update.viettel_status = 'RELEASED';
    update.issued_at = new Date().toISOString();
  } else if (result.status === 'processing') {
    update.status = 'processing';
    update.viettel_status = 'PROCESSING';
  } else {
    update.status = 'failed';
    update.error_code = result.errorCode ?? null;
    update.error_message = result.errorMessage ?? null;
  }
  await sb.from('hotel_invoices').update(update).eq('id', row.id);

  return jsonResponse({
    ok: result.status !== 'failed',
    invoice_id: row.id,
    transaction_uuid: txUuid,
    status: update.status,
    invoice_no: result.invoiceNo ?? null,
  });
});
