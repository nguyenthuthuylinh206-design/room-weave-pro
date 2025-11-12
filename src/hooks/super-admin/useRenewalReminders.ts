import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RenewalReminder } from '@/types/super-admin.types';

export function useRenewalReminders(filters?: {
  status?: 'pending' | 'sent' | 'failed';
  reminderType?: string;
}) {
  return useQuery({
    queryKey: ['renewal-reminders', filters],
    queryFn: async () => {
      let query = supabase
        .from('renewal_reminders')
        .select(`
          *,
          tenant:tenants(id, name, current_period_end)
        `)
        .order('scheduled_for', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.reminderType) {
        query = query.eq('reminder_type', filters.reminderType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function usePendingReminders() {
  return useQuery({
    queryKey: ['renewal-reminders', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renewal_reminders')
        .select(`
          *,
          tenant:tenants(id, name, current_period_end)
        `)
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useReminderStats() {
  return useQuery({
    queryKey: ['reminder-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renewal_reminders')
        .select('status');

      if (error) throw error;

      const totalReminders = data.length;
      const sentReminders = data.filter(r => r.status === 'sent').length;
      const pendingReminders = data.filter(r => r.status === 'pending').length;
      const failedReminders = data.filter(r => r.status === 'failed').length;

      const deliveryRate = totalReminders > 0 
        ? ((sentReminders / totalReminders) * 100).toFixed(2) 
        : '0';

      return {
        totalReminders,
        sentReminders,
        pendingReminders,
        failedReminders,
        deliveryRate,
      };
    },
  });
}

export function useTenantReminders(tenantId: string | null) {
  return useQuery({
    queryKey: ['tenant-reminders', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('renewal_reminders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('scheduled_for', { ascending: false });

      if (error) throw error;
      return data as RenewalReminder[];
    },
    enabled: !!tenantId,
  });
}

export function useScheduleReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('schedule_renewal_reminders');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewal-reminders'] });
      toast.success('Đã lên lịch nhắc nhở gia hạn');
    },
    onError: (error: any) => {
      toast.error('Lỗi lên lịch: ' + error.message);
    },
  });
}

export function useSendReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { data: reminder, error: fetchError } = await supabase
        .from('renewal_reminders')
        .select('*')
        .eq('id', reminderId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('renewal_reminders')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewal-reminders'] });
      toast.success('Đã gửi nhắc nhở');
    },
    onError: (error: any) => {
      toast.error('Lỗi gửi: ' + error.message);
    },
  });
}

export function useBulkSendReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderIds: string[]) => {
      const { data, error } = await supabase
        .from('renewal_reminders')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .in('id', reminderIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['renewal-reminders'] });
      toast.success(`Đã gửi ${data.length} nhắc nhở`);
    },
    onError: (error: any) => {
      toast.error('Lỗi gửi hàng loạt: ' + error.message);
    },
  });
}

export function useDeleteOldReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (daysOld: number = 90) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('renewal_reminders')
        .delete()
        .lt('sent_at', cutoffDate.toISOString())
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['renewal-reminders'] });
      toast.success(`Đã xóa ${data?.length || 0} nhắc nhở cũ`);
    },
    onError: (error: any) => {
      toast.error('Lỗi xóa: ' + error.message);
    },
  });
}
