// Helpers to load config + provider instance, and log API calls atomically.
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EInvoiceConfig, IEInvoiceProvider, redactSecrets } from './types.ts';
import { ViettelInvoiceProvider } from './viettel.ts';

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

export async function loadConfig(
  sb: SupabaseClient,
  configId: string,
): Promise<EInvoiceConfig | null> {
  const { data, error } = await sb
    .from('hotel_einvoice_configs')
    .select('*')
    .eq('id', configId)
    .maybeSingle();
  if (error || !data) return null;
  // Resolve password via Vault
  const { data: pwd, error: pErr } = await sb.rpc('get_einvoice_password', { _config_id: configId });
  if (pErr) throw new Error(`vault_read_failed: ${pErr.message}`);
  return { ...(data as any), api_password: (pwd as string) || '' };
}

export async function makeProvider(
  cfg: EInvoiceConfig,
  sb: SupabaseClient,
  invoiceId?: string | null,
): Promise<IEInvoiceProvider> {
  const log = async (row: any) => {
    try {
      await sb.from('invoice_api_logs').insert({
        tenant_id: cfg.tenant_id,
        hotel_id: cfg.hotel_id,
        invoice_id: invoiceId ?? null,
        provider: cfg.provider,
        endpoint: row.endpoint,
        method: row.method,
        status_code: row.status_code,
        duration_ms: row.duration_ms,
        request_body: redactSecrets(row.request_body),
        response_body: redactSecrets(row.response_body),
        error_message: row.error_message,
      });
    } catch (e) {
      console.error('log_insert_failed', e);
    }
  };

  switch (cfg.provider) {
    case 'viettel_sinvoice':
      return new ViettelInvoiceProvider(cfg, fetch, log);
    default:
      throw new Error(`provider_not_supported: ${cfg.provider}`);
  }
}

export async function persistCachedToken(
  sb: SupabaseClient,
  configId: string,
  token: string | null,
  expiresAt: number,
) {
  if (!token) return;
  await sb.from('hotel_einvoice_configs').update({
    cached_token: token,
    cached_token_expires_at: new Date(expiresAt).toISOString(),
  }).eq('id', configId);
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function requireUser(req: Request) {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } },
  );
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}
