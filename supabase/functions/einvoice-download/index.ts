// Download PDF/XML từ provider, lưu vào einvoice-files bucket, trả về signed URL.
import { adminClient, corsHeaders, jsonResponse, loadConfig, makeProvider, persistCachedToken, requireUser } from '../_shared/einvoice/runtime.ts';

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const user = await requireUser(req);
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'invalid_json' }, 400); }
  const invoiceId: string | undefined = body?.invoice_id;
  const fileType: 'pdf' | 'xml' = (body?.file_type || 'pdf').toLowerCase();
  if (!invoiceId) return jsonResponse({ error: 'missing_invoice_id' }, 400);
  if (!['pdf','xml'].includes(fileType)) return jsonResponse({ error: 'invalid_file_type' }, 400);

  const sb = adminClient();
  const { data: inv, error } = await sb.from('hotel_invoices').select('*').eq('id', invoiceId).maybeSingle();
  if (error || !inv) return jsonResponse({ error: 'invoice_not_found' }, 404);
  if (!inv.invoice_no || !inv.template_code) return jsonResponse({ error: 'invoice_not_ready' }, 400);
  if (inv.status !== 'issued' && inv.status !== 'adjusted' && inv.status !== 'replaced')
    return jsonResponse({ error: 'invoice_not_issued', status: inv.status }, 400);

  // Đã có file cache?
  const { data: existed } = await sb
    .from('invoice_files').select('storage_path,storage_bucket')
    .eq('invoice_id', invoiceId).eq('file_type', fileType).maybeSingle();

  let storagePath = existed?.storage_path as string | undefined;
  const bucket = (existed?.storage_bucket as string) || 'einvoice-files';

  if (!storagePath) {
    const cfg = await loadConfig(sb, inv.config_id);
    if (!cfg) return jsonResponse({ error: 'config_missing' }, 404);
    const provider = await makeProvider(cfg, sb, invoiceId);
    const file = fileType === 'pdf'
      ? await provider.downloadPdf(inv.invoice_no, inv.template_code)
      : await provider.downloadXml(inv.invoice_no, inv.template_code);
    const ct = (provider as any).cachedToken;
    if (ct?.token) await persistCachedToken(sb, cfg.id, ct.token, ct.expiresAt);

    storagePath = `${inv.tenant_id}/${inv.hotel_id}/${inv.id}/${inv.invoice_no}.${fileType}`;
    const bytes = b64ToBytes(file.base64);
    const { error: upErr } = await sb.storage.from('einvoice-files').upload(storagePath, bytes, {
      contentType: file.mimeType,
      upsert: true,
    });
    if (upErr) return jsonResponse({ error: 'upload_failed', detail: upErr.message }, 500);

    await sb.from('invoice_files').insert({
      tenant_id: inv.tenant_id,
      hotel_id: inv.hotel_id,
      invoice_id: invoiceId,
      file_type: fileType,
      storage_bucket: 'einvoice-files',
      storage_path: storagePath,
      mime_type: file.mimeType,
      file_size: bytes.length,
    });
  }

  const { data: signed, error: sErr } = await sb.storage.from(bucket).createSignedUrl(storagePath!, 60 * 10);
  if (sErr) return jsonResponse({ error: 'sign_failed', detail: sErr.message }, 500);

  return jsonResponse({ ok: true, url: signed?.signedUrl, storage_path: storagePath, file_type: fileType });
});
