import { useNavigate } from 'react-router-dom'
import { Minus, X, Maximize2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useConversations } from '@/hooks/useChat'
import { ConversationView } from '@/pages/ChatPage'
import { useChatPopups } from './ChatPopupContext'

const POPUP_WIDTH = 320
const POPUP_GAP = 8
const LAUNCHER_OFFSET = 304 // 280 launcher + 24 margin

function initials(name?: string | null) {
  const s = (name || '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).slice(-2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?'
}

export function ChatPopupWindow({
  conversationId,
  minimized,
  index,
}: {
  conversationId: string
  minimized: boolean
  index: number
}) {
  const navigate = useNavigate()
  const { closePopup, toggleMinimize } = useChatPopups()
  const { data: conversations = [] } = useConversations()
  const conv = conversations.find((c) => c.id === conversationId)

  const title = conv
    ? conv.type === 'direct'
      ? conv.peer?.full_name || 'Người dùng'
      : conv.name || 'Nhóm'
    : 'Đang tải...'

  const right = LAUNCHER_OFFSET + index * (POPUP_WIDTH + POPUP_GAP)

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => toggleMinimize(conversationId)}
        className="fixed bottom-0 z-50 hidden h-9 w-[200px] items-center gap-2 rounded-t-lg border border-b-0 bg-card px-2 text-left shadow-md hover:bg-muted lg:flex"
        style={{ right: LAUNCHER_OFFSET + index * 208 }}
        aria-label={`Mở lại chat với ${title}`}
      >
        <Avatar className="h-5 w-5 shrink-0">
          {conv?.peer?.avatar_url && <AvatarImage src={conv.peer.avatar_url} alt={title} />}
          <AvatarFallback className="text-[9px]">
            {conv?.type === 'group' ? 'GR' : initials(title)}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1 truncate text-xs font-medium">{title}</span>
        {conv && conv.unread_count > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
            {conv.unread_count > 9 ? '9+' : conv.unread_count}
          </span>
        )}
      </button>
    )
  }

  return (
    <section
      className="fixed bottom-0 z-50 hidden h-[440px] w-[320px] flex-col overflow-hidden rounded-t-lg border border-b-0 bg-background shadow-2xl lg:flex"
      style={{ right }}
      aria-label={`Cửa sổ chat với ${title}`}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b bg-card px-2">
        <Avatar className="h-6 w-6 shrink-0">
          {conv?.peer?.avatar_url && <AvatarImage src={conv.peer.avatar_url} alt={title} />}
          <AvatarFallback className="text-[10px]">
            {conv?.type === 'group' ? 'GR' : initials(title)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 truncate text-sm font-semibold">{title}</div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => navigate(`/chat/${conversationId}`)}
          aria-label="Mở trang chat đầy đủ"
          title="Mở trang chat đầy đủ"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => toggleMinimize(conversationId)}
          aria-label="Thu nhỏ"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => closePopup(conversationId)}
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className={cn('flex-1 min-h-0')}>
        <ConversationView conversationId={conversationId} />
      </div>
    </section>
  )
}
