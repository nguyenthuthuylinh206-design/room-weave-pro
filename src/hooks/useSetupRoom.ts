import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

interface SetupRoomResult {
  success: boolean
  added: number
  updated: number
  deleted: number
  message: string
  error?: string
}

export function useSetupRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      roomId, 
      reset = false 
    }: { 
      roomId: string
      reset?: boolean 
    }) => {
      const { data, error } = await supabase
        .rpc('setup_room_initial', {
          p_room_id: roomId,
          p_reset_quantities: reset
        })

      if (error) throw error
      return data as unknown as SetupRoomResult
    },
    onSuccess: (result, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      
      if (result.success) {
        toast({
          title: 'Thành công',
          description: result.message,
        })
      } else {
        toast({
          title: 'Lỗi',
          description: result.error || 'Không thể setup phòng',
          variant: 'destructive',
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi setup phòng',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
