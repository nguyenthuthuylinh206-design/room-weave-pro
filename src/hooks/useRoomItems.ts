import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useToggleItemVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomItemId, isVerified }: { roomItemId: string; isVerified: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('room_items')
        .update({
          is_verified: isVerified,
          verified_at: isVerified ? new Date().toISOString() : null,
          verified_by: isVerified ? user?.id : null,
        })
        .eq('id', roomItemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room'] });
      toast({
        title: variables.isVerified ? 'Đã xác nhận đồ' : 'Đã bỏ xác nhận',
        description: variables.isVerified 
          ? 'Đồ này đã được đánh dấu là có trong phòng'
          : 'Đồ này đã được đánh dấu là thiếu',
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

export function useUpdateRoomItemQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      roomId,
      itemId, 
      quantity,
      roomItemId
    }: { 
      roomId: string;
      itemId: string;
      quantity: number;
      roomItemId: string | null;
    }) => {
      // If quantity is 0, delete the room_item if it exists
      if (quantity === 0) {
        if (roomItemId) {
          const { error } = await supabase
            .from('room_items')
            .delete()
            .eq('id', roomItemId);

          if (error) throw error;
          return null; // Successfully deleted
        }
        // If no roomItemId, nothing to do (no record to delete)
        return null;
      }

      // If room_item exists and quantity > 0, update it
      if (roomItemId) {
        const { data, error } = await supabase
          .from('room_items')
          .update({ quantity })
          .eq('id', roomItemId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new room_item with quantity > 0
        const { data, error } = await supabase
          .from('room_items')
          .insert({
            room_id: roomId,
            item_id: itemId,
            quantity,
            condition: 'good',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi cập nhật số lượng',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
