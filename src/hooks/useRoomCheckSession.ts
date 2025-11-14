import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface RoomCheckSession {
  id: string
  room_id: string
  user_id: string
  user_name: string
  check_type: 'daily' | 'checkin' | 'checkout' | 'maintenance'
  started_at: string
}

export function useRoomCheckSession(roomId: string | undefined) {
  const [session, setSession] = useState<RoomCheckSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!roomId) return

    const fetchSession = async () => {
      try {
        const { data, error } = await supabase
          .from('room_check_sessions')
          .select('*')
          .eq('room_id', roomId)
          .maybeSingle()

        if (error) throw error
        setSession(data ? {
          id: data.id,
          room_id: data.room_id,
          user_id: data.user_id,
          user_name: data.user_name,
          check_type: data.check_type as 'daily' | 'checkin' | 'checkout' | 'maintenance',
          started_at: data.started_at
        } : null)
      } catch (error: any) {
        console.error('Error fetching check session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`room-check-session-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_check_sessions',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setSession(payload.new as RoomCheckSession)
          } else if (payload.eventType === 'DELETE') {
            setSession(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  const createSession = async (
    roomId: string,
    checkType: 'daily' | 'checkin' | 'checkout' | 'maintenance',
    userName: string,
    tenantId: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('room_check_sessions')
        .insert({
          room_id: roomId,
          user_id: user.id,
          user_name: userName,
          check_type: checkType,
          tenant_id: tenantId,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: 'Phòng đang được kiểm tra',
            description: 'Một nhân viên khác đang kiểm tra phòng này',
            variant: 'destructive',
          })
          return null
        }
        throw error
      }

      return data
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
      return null
    }
  }

  const deleteSession = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('room_check_sessions')
        .delete()
        .eq('room_id', roomId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error deleting check session:', error)
    }
  }

  return {
    session,
    isLoading,
    createSession,
    deleteSession,
  }
}

export function useAllRoomCheckSessions() {
  const [sessions, setSessions] = useState<Record<string, RoomCheckSession>>({})

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        console.log('[useAllRoomCheckSessions] Fetching sessions...')
        const { data, error } = await supabase
          .from('room_check_sessions')
          .select('*')

        if (error) {
          console.error('[useAllRoomCheckSessions] Error:', error)
          throw error
        }
        
        console.log('[useAllRoomCheckSessions] Fetched data:', data)
        
        const sessionsMap: Record<string, RoomCheckSession> = {}
        data?.forEach(session => {
          sessionsMap[session.room_id] = {
            id: session.id,
            room_id: session.room_id,
            user_id: session.user_id,
            user_name: session.user_name,
            check_type: session.check_type as 'daily' | 'checkin' | 'checkout' | 'maintenance',
            started_at: session.started_at
          }
        })
        
        console.log('[useAllRoomCheckSessions] Sessions map:', sessionsMap)
        setSessions(sessionsMap)
      } catch (error: any) {
        console.error('[useAllRoomCheckSessions] Error fetching check sessions:', error)
      }
    }

    fetchSessions()

    // Subscribe to all sessions
    const channel = supabase
      .channel('all-room-check-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_check_sessions',
        },
        (payload) => {
          console.log('[useAllRoomCheckSessions] Realtime event:', payload.eventType, payload)
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newSession = payload.new as any
            console.log('[useAllRoomCheckSessions] Adding/updating session:', newSession)
            setSessions(prev => {
              const updated = {
                ...prev,
                [newSession.room_id]: {
                  id: newSession.id,
                  room_id: newSession.room_id,
                  user_id: newSession.user_id,
                  user_name: newSession.user_name,
                  check_type: newSession.check_type as 'daily' | 'checkin' | 'checkout' | 'maintenance',
                  started_at: newSession.started_at
                }
              }
              console.log('[useAllRoomCheckSessions] Updated sessions:', updated)
              return updated
            })
          } else if (payload.eventType === 'DELETE') {
            const oldSession = payload.old as any
            console.log('[useAllRoomCheckSessions] Deleting session:', oldSession)
            setSessions(prev => {
              const newSessions = { ...prev }
              delete newSessions[oldSession.room_id]
              console.log('[useAllRoomCheckSessions] Updated sessions after delete:', newSessions)
              return newSessions
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[useAllRoomCheckSessions] Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return sessions
}
