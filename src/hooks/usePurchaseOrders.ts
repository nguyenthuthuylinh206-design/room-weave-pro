import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PurchaseOrder, POFilters } from '@/types/purchase-order.types';
import { useToast } from './use-toast';

export function usePurchaseOrders(filters?: POFilters) {
  return useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: async () => {
      // Mock data for now - TODO: implement actual query
      const mockPOs: PurchaseOrder[] = [];
      return mockPOs;
    },
  });
}

export function usePOStats() {
  return useQuery({
    queryKey: ['po-stats'],
    queryFn: async () => {
      const mockStats = {
        total_pos: 45,
        pending_approval: 8,
        total_value_30d: 250000000,
        completed_30d: 32
      };
      return mockStats;
    },
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, vendor:vendors(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as PurchaseOrder;
    },
    enabled: !!id,
  });
}

export function useCreatePO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (po: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(po)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({
        title: 'Thành công',
        description: 'Đã tạo đơn đặt hàng mới',
      });
    },
  });
}

export function useUpdatePO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...po }: Partial<PurchaseOrder> & { id: string }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(po)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] });
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật đơn đặt hàng',
      });
    },
  });
}
