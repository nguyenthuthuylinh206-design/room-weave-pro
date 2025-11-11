import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PurchaseOrder, POFilters } from '@/types/purchase-order.types';
import { useToast } from './use-toast';
import { useUser } from './useUser';
import { useHotelContext } from '@/contexts/HotelContext';

export function usePurchaseOrders(filters?: POFilters) {
  const { tenantId } = useUser();
  const { selectedHotel, isAllHotelsMode } = useHotelContext();

  return useQuery({
    queryKey: ['purchase-orders', tenantId, selectedHotel?.id, isAllHotelsMode, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const hotelIdToFilter = isAllHotelsMode ? null : (selectedHotel?.id || null);

      let query: any = supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors(id, name, code),
          items:purchase_order_items(
            *,
            item:items(id, name, code, unit)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('order_date', { ascending: false });

      if (hotelIdToFilter) {
        query = query.eq('hotel_id', hotelIdToFilter);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.vendor_id) {
        query = query.eq('vendor_id', filters.vendor_id);
      }

      if (filters?.date_from) {
        query = query.gte('order_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('order_date', filters.date_to);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as PurchaseOrder[];
    },
    enabled: !!tenantId,
  });
}

export function usePOStats() {
  const { tenantId, hotelId } = useUser();

  return useQuery({
    queryKey: ['po-stats', tenantId, hotelId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let query = supabase
        .from('purchase_orders')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId);

      if (hotelId) {
        query = query.eq('hotel_id', hotelId);
      }

      const { count: totalPOs } = await query;

      const { count: pendingApproval } = await supabase
        .from('purchase_orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'submitted')
        .then(res => ({ count: res.count || 0 }));

      const { data: last30Days } = await supabase
        .from('purchase_orders')
        .select('total_amount, status')
        .eq('tenant_id', tenantId)
        .gte('order_date', thirtyDaysAgo.toISOString());

      const totalValue30d = last30Days?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;
      const completed30d = last30Days?.filter(po => po.status === 'received').length || 0;

      return {
        total_pos: totalPOs || 0,
        pending_approval: pendingApproval || 0,
        total_value_30d: totalValue30d,
        completed_30d: completed30d
      };
    },
    enabled: !!tenantId,
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

export function useApprovePO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (poId: string) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', poId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, poId) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      toast({
        title: 'Thành công',
        description: 'Đã duyệt đơn hàng',
      });
    },
  });
}

export function useRejectPO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
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
        description: 'Đã từ chối đơn hàng',
      });
    },
  });
}

export function useReceivePO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ po_id, items, notes }: any) => {
      // Update received quantities for each item
      for (const item of items) {
        const { error } = await supabase
          .from('purchase_order_items')
          .update({
            quantity_received: item.quantity_to_receive,
            notes: item.notes
          })
          .eq('po_id', po_id)
          .eq('item_id', item.item_id);

        if (error) throw error;
      }

      // Check if all items received
      const { data: poItems } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('po_id', po_id);

      const allReceived = poItems?.every(
        item => item.quantity_received >= item.quantity_ordered
      );

      const someReceived = poItems?.some(item => item.quantity_received > 0);

      const newStatus = allReceived ? 'received' : someReceived ? 'partial' : 'ordered';

      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          status: newStatus,
          actual_delivery_date: allReceived ? new Date().toISOString() : null,
          notes: notes
        })
        .eq('id', po_id);

      if (updateError) throw updateError;

      return { po_id, status: newStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', data.po_id] });
      toast({
        title: 'Thành công',
        description: 'Đã nhận hàng',
      });
    },
  });
}

export function useDeletePO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (poId: string) => {
      // Check if PO status allows deletion
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('status')
        .eq('id', poId)
        .single();

      if (po?.status && !['draft', 'rejected', 'cancelled'].includes(po.status)) {
        throw new Error('Chỉ có thể xóa đơn hàng ở trạng thái nháp, từ chối hoặc đã hủy');
      }

      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', poId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({
        title: 'Thành công',
        description: 'Đã xóa đơn đặt hàng',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
