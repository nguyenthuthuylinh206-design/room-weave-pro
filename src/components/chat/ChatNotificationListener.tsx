import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useBreakpoint } from '@/lib/breakpoints'
import { useChatPopups } from './ChatPopupContext'
import { MessageCircle, Users } from 'lucide-react'

type ToastPosition = 'top-center' | 'bottom-right'

/**
 * Global listener: hiển thị toast nổi khi có tin nhắn mới (không phải của mình)
 * và cửa sổ chat tương ứng chưa mở/đang minimize. Click toast sẽ mở popup chat.
 */
export function ChatNotificationListener() {
  const { user } = useUser()
  const tenantId = user?.tenant_id
  const { popups, openPopup, setLauncherOpen } = useChatPopups()
  const location = useLocation()
  const { isMobile } = useBreakpoint()
  const toastPosition = useMemo<ToastPosition>(() => (isMobile ? 'top-center' : 'bottom-right'), [isMobile])

  // Refs để callback realtime luôn đọc state mới nhất
  const popupsRef = useRef(popups)
  const pathRef = useRef(location.pathname)
  useEffect(() => {
    popupsRef.current = popups
  }, [popups])
  useEffect(() => {
    pathRef.current = location.pathname
  }, [location.pathname])

  // Anti-duplicate (StrictMode / refetch)
  const seenRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id || !tenantId) return

    const channel = supabase
      .channel(`chat-notify-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `tenant_id=eq.${tenantId}` },
        async (payload: any) => {
          const msg = payload.new
          if (!msg || !msg.id || msg.sender_id === user.id) return
          if (seenRef.current.has(msg.id)) return
          seenRef.current.add(msg.id)

          // Bỏ qua nếu cửa sổ chat đó đang mở và không minimize
          const openActive = popupsRef.current.find(
            (p) => p.conversationId === msg.conversation_id && !p.minimized
          )
          if (openActive) return

          // Bỏ qua nếu user đang ở trang /chat (đã thấy danh sách)
          if (pathRef.current.startsWith('/chat')) return

          // Kiểm tra user có phải member của conversation không
          const { data: member } = await supabase
            .from('conversation_members')
            .select('user_id, muted_until')
            .eq('conversation_id', msg.conversation_id)
            .eq('user_id', user.id)
            .maybeSingle()
          if (!member) return
          if (member.muted_until && new Date(member.muted_until) > new Date()) return

          // Lấy thông tin sender + conversation
          const [{ data: sender }, { data: conv }] = await Promise.all([
            supabase.from('users').select('full_name, avatar_url').eq('id', msg.sender_id).maybeSingle(),
            supabase.from('conversations').select('type, name').eq('id', msg.conversation_id).maybeSingle(),
          ])

          const senderName = sender?.full_name || 'Người dùng'
          const isGroup = conv?.type === 'group'
          const convName = conv?.name || (isGroup ? 'Nhóm' : 'Chat 1-1')
          const displayTitle = isGroup ? `${senderName} → ${convName}` : senderName
          const preview = (msg.body || '').slice(0, 80) || (msg.has_attachment ? '[Đính kèm]' : 'Tin nhắn mới')

          toast(
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {isGroup ? (
                  <Users className="h-4 w-4 text-primary" />
                ) : (
                  <MessageCircle className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{displayTitle}</div>
              </div>
            </div>,
            {
              description: (
                <div className="flex items-start gap-2.5 pl-[2.625rem]">
                  <span className="text-sm text-muted-foreground line-clamp-2">{preview}</span>
                </div>
              ),
              position: toastPosition,
              duration: 6000,
              className: 'chat-message-toast',
              action: {
                label: 'Mở chat',
                onClick: () => {
                  setLauncherOpen(true)
                  openPopup(msg.conversation_id)
                },
              },
              onAutoClose: () => seenRef.current.delete(msg.id),
              onDismiss: () => seenRef.current.delete(msg.id),
            }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, tenantId, openPopup, setLauncherOpen, toastPosition])

  return null
}
