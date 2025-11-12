import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Tenant {
  id: string;
  name: string;
  email: string;
  primary_contact_email?: string;
  phone?: string;
  subscription_plan_id: string;
  subscription_status: 'active' | 'trial' | 'cancelled' | 'suspended' | 'grace_period';
  subscription_start_date: string;
  subscription_end_date: string;
  created_at: string;
}

export function useTenants() {
  return useQuery({
    queryKey: ['super-admin-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .neq('id', '00000000-0000-0000-0000-000000000000') // Exclude SYSTEM_ADMIN tenant
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map email to primary_contact_email for backwards compatibility
      return (data || []).map(tenant => ({
        ...tenant,
        primary_contact_email: tenant.email,
      })) as Tenant[];
    },
  });
}

export function useSuspendTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase
        .from('tenants')
        .update({ subscription_status: 'suspended' })
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      toast({
        title: 'Tenant Suspended',
        description: 'The tenant has been suspended successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
