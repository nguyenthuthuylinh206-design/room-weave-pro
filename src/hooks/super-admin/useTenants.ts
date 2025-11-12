import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Get all tenants with subscription details
 */
export function useTenants() {
  return useQuery({
    queryKey: ['super-admin-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          subscription_plan:subscription_plans(
            name,
            price_monthly,
            price_yearly
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get single tenant details
 */
export function useTenant(tenantId: string | null) {
  return useQuery({
    queryKey: ['super-admin-tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          subscription_plan:subscription_plans(*)
        `)
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

/**
 * Suspend tenant
 */
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
        description: 'Tenant has been suspended successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Suspending Tenant',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Reactivate tenant
 */
export function useReactivateTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase
        .from('tenants')
        .update({ subscription_status: 'active' })
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      toast({
        title: 'Tenant Reactivated',
        description: 'Tenant has been reactivated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Reactivating Tenant',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete tenant (soft delete)
 */
export function useDeleteTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      toast({
        title: 'Tenant Deleted',
        description: 'Tenant has been permanently deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Deleting Tenant',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
