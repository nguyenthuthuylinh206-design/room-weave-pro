import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, Minus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useConversations } from '@/hooks/useChat'
import { usePendingCounts } from '@/hooks/usePendingCounts'
import { ConversationRow, ConversationView, NewConversationDialog } from '@/pages/ChatPage'

function initials(name?: string | null, fallback = '?') {
  const s = (name || '').trim()
  if (!s) return fallback
  const parts = s.split(/\s+/).slice(-2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || fallback
}

function removeDiacritics(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function DesktopChatWindow() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const { data: conversations = [], isLoading } = useConversations()
  const { data: pendingCounts } = usePendingCounts()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  if (location.pathname.startsWith('/chat')) return null

  const unread = pendingCounts?.chatUnread || 0
  const activeConv = conversations.find((c) => c.id === activeId) || null
  const activeTitle = activeConv
    ? activeConv.type === 'direct'
      ? activeConv.peer?.full_name || 'Người dùng'
      : activeConv.name || 'Nhóm'
    : null

  const visibleConvs = useMemo(() => {
    const q = removeDiacritics(search.trim())
    if (!q) return conversations
    return conversations.filter((c) => {
      const title = c.type === 'direct' ? c.peer?.full_name || '' : c.name || ''
      return removeDiacritics(`${title} ${c.last_message_preview || ''}`).includes(q)
    })
  }, [conversations, search])

  const handleOpen = () => {
    setOpen(true)
    setMinimized(false)
  }

  if (!open || minimized) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="fixed bottom-5 right-5 z-50 hidden h-12 w-12 items-center justify-center rounded-full border bg-background text-foreground shadow-lg transition-colors hover:bg-muted md:flex"
        aria-label="Mở cửa sổ tin nhắn"
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
    <section className="fixed bottom-5 right-5 z-50 hidden h-[620px] w-[760px] max-h-[calc(100dvh-2.5rem)] max-w-[calc(100vw-19rem)] overflow-hidden rounded-lg border bg-background shadow-2xl md:flex">
      <div className="w-72 border-r flex flex-col min-h-0">
        <div className="p-2 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold truncate">Tin nhắn</h2>
            {unread > 0 && <span className="text-xs text-primary font-medium">{unread}</span>}
          </div>
          <NewConversationDialog onCreated={(id) => setActiveId(id)} />
        </div>
        <div className="p-2 border-b">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm hội thoại..."
            className="h-8 text-xs"
          />
        </div>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
          ) : visibleConvs.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">
              {conversations.length === 0 ? 'Chưa có hội thoại.' : 'Không có hội thoại khớp.'}
            </div>
          ) : (
            visibleConvs.map((c) => (
              <ConversationRow
                key={c.id}
                conv={c}
                active={c.id === activeId}
                meId={user?.id || ''}
                onClick={() => setActiveId(c.id)}
              />
            ))
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-2 py-1.5 border-b flex items-center gap-2 shrink-0">
          {activeConv ? (
            <>
              <Avatar className="h-7 w-7">
                {activeConv.peer?.avatar_url && <AvatarImage src={activeConv.peer.avatar_url} alt={activeTitle || ''} />}
                <AvatarFallback className="text-[10px]">
                  {activeConv.type === 'group' ? 'GR' : initials(activeTitle)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{activeTitle}</div>
                <div className="text-[10px] text-muted-foreground">{activeConv.type === 'group' ? 'Nhóm' : '1-1'}</div>
              </div>
            </>
          ) : (
            <div className="flex-1 text-sm font-semibold">Cửa sổ chat</div>
          )}
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate('/chat')}>
            Mở đầy đủ
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setMinimized(true)} aria-label="Thu nhỏ">
            <Minus className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOpen(false)} aria-label="Đóng">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className={cn('flex-1 min-h-0', !activeId && 'flex items-center justify-center text-sm text-muted-foreground')}>
          {activeId ? <ConversationView conversationId={activeId} /> : 'Chọn một hội thoại để bắt đầu'}
        </div>
      </div>
    </section>
  )
}