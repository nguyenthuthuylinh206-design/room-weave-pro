import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHotelContext } from '@/contexts/HotelContext';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type EInvoiceProvider = 'viettel_sinvoice' | 'misa' | 'vnpt' | 'easyinvoice';

export interface EInvoiceConfig {
  id: string;
  tenant_id: string;
  hotel_id: string;
  provider: EInvoiceProvider;
  tax_code: string;
  branch_code: string | null;
  supplier_legal_name: string | null;
  supplier_address: string | null;
  api_base_url: string;
  api_username: string;
  api_password_secret_ref: string | null;
  sign_type: 'cloud' | 'usb_token';
  environment: 'sandbox' | 'production';
  default_template_code: string | null;
  default_invoice_series: string | null;
  is_active: boolean;
  auto_issue: boolean;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTemplate {
  id: string;
  hotel_id: string;
  provider: EInvoiceProvider;
  template_code: string;
  invoice_series: string;
  template_name: string | null;
  is_default: boolean;
  is_active: boolean;
}

const QK_CONFIG = (hotelId?: string) => ['einvoice-config', hotelId];
const QK_TEMPLATES = (hotelId?: string) => ['einvoice-templates', hotelId];

export function useEInvoiceConfig() {
  const { selectedHotel } = useHotelContext();
  const { tenant } = useTenant();
  return useQuery({
    queryKey: QK_CONFIG(selectedHotel?.id),
    enabled: !!selectedHotel?.id && !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_einvoice_configs')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .eq('hotel_id', selectedHotel!.id)
        .eq('provider', 'viettel_sinvoice')
        .maybeSingle();
      if (error) throw error;
      return (data as EInvoiceConfig | null) ?? null;
    },
  });
}

export function useInvoiceTemplates() {
  const { selectedHotel } = useHotelContext();
  const { tenant } = useTenant();
  return useQuery({
    queryKey: QK_TEMPLATES(selectedHotel?.id),
    enabled: !!selectedHotel?.id && !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .eq('hotel_id', selectedHotel!.id)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return (data as InvoiceTemplate[]) ?? [];
    },
  });
}

export function useUpsertEInvoiceConfig() {
  const qc = useQueryClient();
  const { selectedHotel } = useHotelContext();
  const { tenant } = useTenant(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<EInvoiceConfig> & { password?: string }) => {
      if (!selectedHotel?.id || !tenant?.id) throw new Error('Chưa chọn khách sạn');
      const { password, ...rest } = input;
      const payload: any = {
        tenant_id: tenant.id,
        hotel_id: selectedHotel.id,
        provider: 'viettel_sinvoice',
        created_by: user?.id ?? null,
        ...rest,
      };
      const { data, error } = await supabase
        .from('hotel_einvoice_configs')
        .upsert(payload, { onConflict: 'hotel_id,provider' })
        .select('*')
        .single();
      if (error) throw error;
      const cfg = data as EInvoiceConfig;
      if (password && password.trim().length > 0) {
        const { error: pErr } = await supabase.rpc('set_einvoice_password', {
          _config_id: cfg.id,
          _password: password,
        });
        if (pErr) throw pErr;
      }
      return cfg;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_CONFIG(selectedHotel?.id) });
      toast.success('Đã lưu cấu hình hóa đơn điện tử');
    },
    onError: (e: any) => toast.error(e?.message || 'Lưu thất bại'),
  });
}

export function useTestEInvoiceConnection() {
  const qc = useQueryClient();
  const { selectedHotel } = useHotelContext();
  return useMutation({
    mutationFn: async (config_id: string) => {
      const { data, error } = await supabase.functions.invoke('einvoice-test-connection', {
        body: { config_id },
      });
      if (error) throw error;
      return data as { ok: boolean; message: string };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: QK_CONFIG(selectedHotel?.id) });
      if (r.ok) toast.success('Kết nối thành công: ' + r.message);
      else toast.error('Kết nối thất bại: ' + r.message);
    },
    onError: (e: any) => toast.error(e?.message || 'Không gọi được API'),
  });
}

export function useFetchProviderTemplates() {
  return useMutation({
    mutationFn: async (config_id: string) => {
      const { data, error } = await supabase.functions.invoke('einvoice-list-templates', {
        body: { config_id },
      });
      if (error) throw error;
      return data as { ok: boolean; templates?: Array<{ templateCode: string; invoiceSeries: string; name?: string }>; error?: string };
    },
  });
}

export function useUpsertTemplate() {
  const qc = useQueryClient();
  const { selectedHotel } = useHotelContext();
  const { tenant } = useTenant();
  return useMutation({
    mutationFn: async (input: { id?: string; template_code: string; invoice_series: string; template_name?: string; is_default?: boolean }) => {
      if (!selectedHotel?.id || !tenant?.id) throw new Error('Chưa chọn khách sạn');
      if (input.is_default) {
        // Bỏ default cũ
        await supabase.from('invoice_templates')
          .update({ is_default: false })
          .eq('hotel_id', selectedHotel.id)
          .eq('provider', 'viettel_sinvoice');
      }
      const payload: any = {
        tenant_id: tenant.id,
        hotel_id: selectedHotel.id,
        provider: 'viettel_sinvoice',
        ...input,
      };
      const { error } = await supabase.from('invoice_templates').upsert(payload, {
        onConflict: 'hotel_id,provider,template_code,invoice_series',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_TEMPLATES(selectedHotel?.id) });
      toast.success('Đã lưu template');
    },
    onError: (e: any) => toast.error(e?.message || 'Lưu thất bại'),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  const { selectedHotel } = useHotelContext();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoice_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_TEMPLATES(selectedHotel?.id) });
      toast.success('Đã xóa');
    },
  });
}
