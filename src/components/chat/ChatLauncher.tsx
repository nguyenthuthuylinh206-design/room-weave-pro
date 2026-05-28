import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X, Minus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useConversations, type ConversationListItem } from '@/hooks/useChat'
import { usePendingCounts } from '@/hooks/usePendingCounts'
import { useOnlinePresence } from '@/hooks/useOnlinePresence'
import { NewConversationDialog } from '@/pages/ChatPage'
import { ChatPopupProvider, useChatPopups } from './ChatPopupContext'
import { ChatPopupWindow } from './ChatPopupWindow'

function removeDiacritics(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function initials(name?: string | null) {
  const s = (name || '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).slice(-2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?'
}

export function ChatLauncher() {
  const location = useLocation()
  if (location.pathname.startsWith('/chat')) return null

  return (
    <ChatPopupProvider>
      <ChatLauncherInner />
      <PopupStack />
    </ChatPopupProvider>
  )
}

function PopupStack() {
  const { popups } = useChatPopups()
  return (
    <>
      {popups.map((p, i) => (
        <ChatPopupWindow
          key={p.conversationId}
          conversationId={p.conversationId}
          minimized={p.minimized}
          index={i}
        />
      ))}
    </>
  )
}

function ChatLauncherInner() {
  const { user } = useUser()
  const { data: conversations = [], isLoading } = useConversations()
  const { data: pendingCounts } = usePendingCounts()
  const { data: onlineIds } = useOnlinePresence()
  const { openPopup } = useChatPopups()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const unread = pendingCounts?.chatUnread || 0

  const visible = useMemo(() => {
    const q = removeDiacritics(search.trim())
    if (!q) return conversations
    return conversations.filter((c) => {
      const title = c.type === 'direct' ? c.peer?.full_name || '' : c.name || ''
      return removeDiacritics(`${title} ${c.last_message_preview || ''}`).includes(q)
    })
  }, [conversations, search])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 hidden h-12 w-12 items-center justify-center rounded-full border bg-background text-foreground shadow-lg transition-colors hover:bg-muted lg:flex"
        aria-label="Mở danh sách tin nhắn"
      >
        <MessageCircle className="h-5 w-5" />
        {unread > 0 && (
          <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]">
            {unread > 9 ? '9+' : unread}
          </Badge>
        )}
      </button>
    )
  }

  return (
    <aside
      className="fixed bottom-0 right-5 z-40 hidden h-[440px] w-[280px] flex-col overflow-hidden rounded-t-lg border border-b-0 bg-background shadow-2xl lg:flex"
      aria-label="Danh sách tin nhắn"
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b bg-card px-2">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <h2 className="truncate text-sm font-semibold">Tin nhắn</h2>
          {unread > 0 && <span className="text-xs font-medium text-primary">{unread}</span>}
        </div>
        <div className="flex items-center gap-1">
          <NewConversationDialog onCreated={(id) => openPopup(id)} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setOpen(false)}
            aria-label="Thu nhỏ"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b p-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm hội thoại..."
          className="h-8 text-xs"
        />
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-xs text-muted-foreground">Đang tải...</div>
        ) : visible.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {conversations.length === 0 ? 'Chưa có hội thoại.' : 'Không có hội thoại khớp.'}
          </div>
        ) : (
          visible.map((c) => (
            <ConversationItem
              key={c.id}
              conv={c}
              meId={user?.id || ''}
              isOnline={!!(c.peer?.id && onlineIds?.has(c.peer.id))}
              onClick={() => openPopup(c.id)}
            />
          ))
        )}
      </ScrollArea>
    </aside>
  )
}

function ConversationItem({
  conv,
  meId,
  isOnline,
  onClick,
}: {
  conv: ConversationListItem
  meId: string
  isOnline: boolean
  onClick: () => void
}) {
  const title = conv.type === 'direct' ? conv.peer?.full_name || 'Người dùng' : conv.name || 'Nhóm'
  const isGroup = conv.type === 'group'
  const unread = conv.unread_count > 0
  void meId
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 border-b px-2.5 py-2 text-left transition-colors hover:bg-muted/50',
        unread && 'bg-muted/30'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8">
          {conv.peer?.avatar_url && <AvatarImage src={conv.peer.avatar_url} alt={title} />}
          <AvatarFallback className="text-[10px]">
            {isGroup ? 'GR' : initials(title)}
          </AvatarFallback>
        </Avatar>
        {!isGroup && (
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
              isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'
            )}
            aria-label={isOnline ? 'Đang online' : 'Offline'}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>
          {title}
        </div>
      </div>
      {unread && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
          {conv.unread_count > 9 ? '9+' : conv.unread_count}
        </span>
      )}
    </button>
  )
}
