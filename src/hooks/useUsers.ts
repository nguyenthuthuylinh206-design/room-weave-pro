import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { User } from '@/types/database.types'
import { useToast } from '@/hooks/use-toast'

export function useUsers() {
  const { toast } = useToast()

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as User[]
    },
  })

  return {
    users,
    isLoading,
    error,
  }
}
