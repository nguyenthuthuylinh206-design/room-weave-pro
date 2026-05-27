import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'

export interface ConversationListItem {
  id: string
  tenant_id: string
  hotel_id: string
  type: 'direct' | 'group'
  name: string | null
  last_message_at: string | null
  last_message_preview: string | null
  last_sender_id: string | null
  muted_until: string | null
  last_read_message_id: string | null
  unread_count: number
  peer?: { id: string; full_name: string | null; avatar_url: string | null } | null
}

export interface ChatAttachment {
  id: string
  message_id: string
  storage_path: string
  file_name: string | null
  mime_type: string | null
  size_bytes: number | null
  width: number | null
  height: number | null
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  body: string | null
  parent_message_id: string | null
  mentioned_user_ids: string[]
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  sender?: { id: string; full_name: string | null; avatar_url: string | null }
  attachments?: ChatAttachment[]
}

export function useConversations() {
  const { user } = useUser()
  const { selectedHotel } = useHotelContext()
  const tenantId = user?.tenant_id
  const hotelId = selectedHotel?.id
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['chat-conversations', tenantId, hotelId, user?.id],
    enabled: !!tenantId && !!user?.id,
    queryFn: async (): Promise<ConversationListItem[]> => {
      let q = supabase
        .from('v_user_conversations')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('last_message_at', { ascending: false, nullsFirst: false })
      if (hotelId) q = q.eq('hotel_id', hotelId)
      const { data, error } = await q
      if (error) throw error
      const convs = (data || []) as any[]

      // Lấy peer cho DM
      const dmConvs = convs.filter((c) => c.type === 'direct')
      if (dmConvs.length > 0) {
        const convIds = dmConvs.map((c) => c.id)
        const { data: members } = await supabase
          .from('conversation_members')
          .select('conversation_id, user_id')
          .in('conversation_id', convIds)
          .is('left_at', null)
        const peerIds = (members || [])
          .filter((m) => m.user_id !== user!.id)
          .map((m) => m.user_id)
        if (peerIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .in('id', peerIds)
          const userMap = new Map((users || []).map((u: any) => [u.id, u]))
          const peerByConv = new Map<string, any>()
          for (const m of members || []) {
            if (m.user_id !== user!.id) peerByConv.set(m.conversation_id, userMap.get(m.user_id))
          }
          convs.forEach((c) => {
            if (c.type === 'direct') c.peer = peerByConv.get(c.id) || null
          })
        }
      }
      return convs
    },
  })

  // Realtime: invalidate khi có thay đổi trên conversations hoặc messages
  useEffect(() => {
    if (!user?.id || !tenantId) return
    const channel = supabase
      .channel(`chat-list-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `tenant_id=eq.${tenantId}` },
        () => queryClient.invalidateQueries({ queryKey: ['chat-conversations', tenantId] })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-conversations', tenantId] })
          queryClient.invalidateQueries({ queryKey: ['chat-unread-count', user.id] })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, tenantId, queryClient])

  return query
}

export function useUnreadChatCount() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['chat-unread-count', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_user_conversations')
        .select('unread_count')
        .eq('viewer_id', user!.id)
      if (error) return 0
      return (data || []).reduce((s: number, r: any) => s + (r.unread_count || 0), 0)
    },
  })
}

export function useMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient()
  const { user } = useUser()

  const query = useQuery({
    queryKey: ['chat-messages', conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true })
        .limit(200)
      if (error) throw error
      const msgs = (data || []) as any[]
      const senderIds = Array.from(new Set(msgs.map((m) => m.sender_id)))
      if (senderIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', senderIds)
        const map = new Map((users || []).map((u: any) => [u.id, u]))
        msgs.forEach((m) => (m.sender = map.get(m.sender_id)))
      }
      const msgIds = msgs.map((m) => m.id)
      if (msgIds.length > 0) {
        const { data: atts } = await supabase
          .from('message_attachments')
          .select('*')
          .in('message_id', msgIds)
        const byMsg = new Map<string, any[]>()
        for (const a of atts || []) {
          const list = byMsg.get(a.message_id) || []
          list.push(a)
          byMsg.set(a.message_id, list)
        }
        msgs.forEach((m) => (m.attachments = byMsg.get(m.id) || []))
      }
      return msgs
    },
  })

  useEffect(() => {
    if (!conversationId || !user?.id) return
    const channel = supabase
      .channel(`chat-msg-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, user?.id, queryClient])

  return query
}

export interface UploadedChatAttachment {
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  width?: number
  height?: number
}

export function useSendMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { body: string; attachments?: UploadedChatAttachment[] }) => {
      if (!conversationId) throw new Error('missing conversation')
      const clientMsgId = crypto.randomUUID()
      const { data, error } = await supabase.rpc('send_chat_message', {
        _conversation_id: conversationId,
        _body: args.body,
        _parent_message_id: null,
        _client_msg_id: clientMsgId,
        _mentioned_user_ids: [],
        _attachments: (args.attachments || []) as any,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] })
    },
  })
}

/** Upload a file to chat-attachments bucket under {conversationId}/ */
export async function uploadChatAttachment(
  conversationId: string,
  file: File
): Promise<UploadedChatAttachment> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
  const safeBase = file.name.replace(/[^\w.\-]/g, '_').slice(0, 80)
  const path = `${conversationId}/${Date.now()}-${crypto.randomUUID()}-${safeBase}`
  const { error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
  if (error) throw error
  let width: number | undefined
  let height: number | undefined
  if (file.type.startsWith('image/')) {
    try {
      const dim = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
      width = dim.w
      height = dim.h
    } catch {}
  }
  return {
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    width,
    height,
  }
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.rpc('mark_conversation_read', {
        _conversation_id: conversationId,
        _up_to_message_id: null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-unread-count', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
    },
  })
}

export function useCreateDirectConversation() {
  const { selectedHotel } = useHotelContext()
  return useMutation({
    mutationFn: async (peerId: string) => {
      if (!selectedHotel?.id) throw new Error('Chưa chọn khách sạn')
      const { data, error } = await supabase.rpc('create_direct_conversation', {
        _hotel_id: selectedHotel.id,
        _peer_user_id: peerId,
      })
      if (error) throw error
      return data as string
    },
  })
}

export function useCreateGroupConversation() {
  const { selectedHotel } = useHotelContext()
  return useMutation({
    mutationFn: async (args: { name: string; memberIds: string[] }) => {
      if (!selectedHotel?.id) throw new Error('Chưa chọn khách sạn')
      const { data, error } = await supabase.rpc('create_group_conversation', {
        _hotel_id: selectedHotel.id,
        _name: args.name,
        _member_ids: args.memberIds,
      })
      if (error) throw error
      return data as string
    },
  })
}

export function useHotelMembers() {
  const { user } = useUser()
  const { selectedHotel } = useHotelContext()
  return useQuery({
    queryKey: ['chat-hotel-members', selectedHotel?.id, user?.tenant_id],
    enabled: !!selectedHotel?.id && !!user?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, email')
        .eq('tenant_id', user!.tenant_id)
        .neq('id', user!.id)
        .order('full_name')
        .limit(200)
      if (error) throw error
      return data || []
    },
  })
}
