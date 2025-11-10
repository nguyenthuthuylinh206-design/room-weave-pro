import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Vendor, VendorFilters, VendorStats } from '@/types/vendor.types';
import { useToast } from './use-toast';

export function useVendors(filters?: VendorFilters) {
  return useQuery({
    queryKey: ['vendors', filters],
    queryFn: async () => {
      let query = supabase
        .from('vendors')
        .select('*')
        .order(filters?.sort_by || 'name', { 
          ascending: filters?.sort_order === 'asc' 
        });

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.min_rating) {
        query = query.gte('rating', filters.min_rating);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Vendor[];
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Vendor;
    },
    enabled: !!id,
  });
}

export function useVendorStats() {
  return useQuery({
    queryKey: ['vendor-stats'],
    queryFn: async () => {
      // Mock data for now - TODO: create database function
      const mockStats: VendorStats = {
        total_vendors: 0,
        active_vendors: 0,
        new_this_month: 0,
        average_rating: 0,
        total_orders_30d: 0,
        total_value_30d: 0
      };
      return mockStats;
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('vendors')
        .insert(vendor)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({
        title: 'Thành công',
        description: 'Đã thêm nhà cung cấp mới',
      });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...vendor }: Partial<Vendor> & { id: string }) => {
      const { data, error } = await supabase
        .from('vendors')
        .update(vendor)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.id] });
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật thông tin nhà cung cấp',
      });
    },
  });
}

export function useVendorPOs(vendorId: string) {
  return useQuery({
    queryKey: ['vendor-pos', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('order_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (vendorId: string) => {
      // Check if vendor has active purchase orders
      const { count } = await supabase
        .from('purchase_orders')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .in('status', ['submitted', 'approved', 'ordered', 'partial'])
      
      if (count && count > 0) {
        throw new Error('Không thể xóa nhà cung cấp có đơn hàng đang xử lý')
      }
      
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast({
        title: 'Thành công',
        description: 'Đã xóa nhà cung cấp',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
