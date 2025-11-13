import { useMutation, useQueryClient } from '@tanstack/react-query';
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
