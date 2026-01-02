import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BankPaymentSettings {
  id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  payment_prefix: string;
  qr_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBankPaymentSettings() {
  return useQuery({
    queryKey: ['bank-payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_payment_settings')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data as BankPaymentSettings | null;
    },
  });
}

export function useAllBankPaymentSettings() {
  return useQuery({
    queryKey: ['bank-payment-settings', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_payment_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BankPaymentSettings[];
    },
  });
}

export function useCreateBankPaymentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Omit<BankPaymentSettings, 'id' | 'created_at' | 'updated_at'>) => {
      // Deactivate all existing settings first
      await supabase
        .from('bank_payment_settings')
        .update({ is_active: false })
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('bank_payment_settings')
        .insert(settings)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-payment-settings'] });
      toast.success('Đã lưu thông tin thanh toán');
    },
    onError: (error) => {
      console.error('Error saving bank settings:', error);
      toast.error('Không thể lưu thông tin thanh toán');
    },
  });
}

export function useUpdateBankPaymentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...settings }: Partial<BankPaymentSettings> & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_payment_settings')
        .update(settings)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-payment-settings'] });
      toast.success('Đã cập nhật thông tin thanh toán');
    },
    onError: (error) => {
      console.error('Error updating bank settings:', error);
      toast.error('Không thể cập nhật thông tin thanh toán');
    },
  });
}

export function useDeleteBankPaymentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_payment_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-payment-settings'] });
      toast.success('Đã xóa thông tin thanh toán');
    },
    onError: (error) => {
      console.error('Error deleting bank settings:', error);
      toast.error('Không thể xóa thông tin thanh toán');
    },
  });
}
