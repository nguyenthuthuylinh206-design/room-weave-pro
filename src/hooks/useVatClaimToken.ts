import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface VatClaimToken {
  token: string
  expires_at: string
  status: string
}

/** Idempotently ensure a VAT claim token exists for an invoice. Reuses pending tokens. */
export function useVatClaimToken(invoiceId: string | null | undefined) {
  return useQuery({
    queryKey: ['vat-claim-token', invoiceId],
    enabled: !!invoiceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<VatClaimToken | null> => {
      if (!invoiceId) return null
      const { data, error } = await supabase.rpc('ensure_vat_claim_token', { p_invoice_id: invoiceId })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (!row) return null
      return { token: row.token, expires_at: row.expires_at, status: row.status }
    },
  })
}
